import { Kafka, logLevel } from 'kafkajs';
import { RetryConsumer, InMemoryIdempotencyStore } from '@veridex/shared';
import { env } from '../config/env';
import { Topics, AuthUserRegisteredEvent } from '@veridex/event-contracts';
import { OrganizationService } from '../services/user-org.service';
import { UserRepo } from '../repositories/user.repo';

const kafka = new Kafka({
  clientId: 'user-org-service',
  brokers: [env.KAFKA_BROKER],
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 100,
    retries: 3,
  },
});

let retryConsumer: RetryConsumer | null = null;

/**
 * Start consuming auth events
 * 
 * Uses RetryConsumer for:
 * - Automatic retries with exponential backoff
 * - Dead-letter queue for failed messages
 * - Idempotency to prevent duplicate user creation
 */
export async function startAuthConsumer(): Promise<void> {
  retryConsumer = new RetryConsumer({
    kafka,
    groupId: 'user-org-auth-consumer',
    topics: [Topics.AUTH_USER_REGISTERED, Topics.AUTH_USER_LOGGED_IN],
    
    // Retry configuration
    retryConfig: {
      maxRetries: 5,
      initialDelayMs: 1000,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
    },
    
    // Dead-letter queue topic
    dlqTopic: 'auth.user-registered.dlq',
    
    // Idempotency store (prevents duplicate user creation)
    idempotencyStore: new InMemoryIdempotencyStore(),
    
    // Message handler
    handler: async (payload) => {
      const value = payload.message.value?.toString();
      if (!value) return;

      const event = JSON.parse(value);
      
      // Route to appropriate handler based on topic
      if (payload.topic === Topics.AUTH_USER_REGISTERED) {
        console.log(`[Kafka] Processing USER_REGISTERED event for user ${event.userId}`);
        await handleUserRegistered(event as AuthUserRegisteredEvent);
      } else if (payload.topic === Topics.AUTH_USER_LOGGED_IN) {
        console.log(`[Kafka] Processing USER_LOGGED_IN event for user ${event.userId}`);
        await handleUserLoggedIn(event);
      }
    },
  });

  await retryConsumer.start();
  console.log(`[Kafka] Auth consumer started with retry support`);
}

/**
 * Handle USER_REGISTERED event
 * - Creates user profile in user-org-service (auto-sync to admin portal)
 * - If MERCHANT with companyName, auto-creates organization
 */
async function handleUserRegistered(event: AuthUserRegisteredEvent): Promise<void> {
  const { userId, email, role, firstName, lastName, companyName, industry } = event;

  try {
    // 1. Create or find user profile (this ensures consumer is visible in admin portal)
    let user = await UserRepo.findByAuthUserId(userId);
    if (!user) {
      user = await UserRepo.create({
        authUserId: userId,
        email,
        role,
        firstName,
        lastName,
        isActive: true,
        lastLoginAt: new Date(),
      } as any);
      console.log(`[UserOrg] Created user profile for ${email} (role: ${role})`);
    }

    // 2. If MERCHANT with companyName, auto-create organization
    if (role === 'MERCHANT' && companyName) {
      try {
        const org = await OrganizationService.create({
          name: companyName,
          type: industry === 'CANNABIS' ? 'DISPENSARY' : 'MERCHANT',
          ownerUserId: userId,
        });
        console.log(`[UserOrg] Auto-created organization "${companyName}" for merchant ${email}`);
      } catch (orgError: any) {
        // If org already exists (from manual creation), that's fine
        if (orgError.code === 'CONFLICT') {
          console.log(`[UserOrg] Organization "${companyName}" already exists for ${email}`);
        } else {
          console.error(`[UserOrg] Failed to create organization for ${email}:`, orgError);
        }
      }
    }
  } catch (error) {
    console.error(`[UserOrg] Failed to process USER_REGISTERED for ${email}:`, error);
  }
}

/**
 * Handle USER_LOGGED_IN event
 * - Creates user profile if it doesn't exist (for consumers who signed up before event system)
 * - Updates lastLoginAt for existing users
 * This ensures all consumers are visible in admin portal even if they only log in
 */
async function handleUserLoggedIn(event: { userId: string; email?: string }): Promise<void> {
  const { userId, email } = event;

  try {
    // Find user by auth ID
    let user = await UserRepo.findByAuthUserId(userId);
    
    if (user) {
      // Update last login time
      await UserRepo.update(user._id.toString(), {
        lastLoginAt: new Date(),
      });
      console.log(`[UserOrg] Updated lastLoginAt for user ${email || userId}`);
    } else if (email) {
      // User doesn't exist in user-org-service yet - create their profile
      // This handles consumers who registered before the event system was in place
      user = await UserRepo.create({
        authUserId: userId,
        email,
        role: 'CONSUMER', // Default to consumer for login-only sync
        isActive: true,
        lastLoginAt: new Date(),
      } as any);
      console.log(`[UserOrg] Auto-created profile for logged-in user ${email}`);
    }
  } catch (error) {
    console.error(`[UserOrg] Failed to process USER_LOGGED_IN for ${userId}:`, error);
  }
}

/**
 * Gracefully disconnect consumer
 */
export async function disconnectAuthConsumer(): Promise<void> {
  if (retryConsumer) {
    await retryConsumer.stop();
    retryConsumer = null;
    console.log('[Kafka] Auth consumer disconnected');
  }
}
