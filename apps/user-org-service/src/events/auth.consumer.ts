import { Kafka, Consumer, logLevel } from 'kafkajs';
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

let consumer: Consumer | null = null;

/**
 * Start consuming auth events
 */
export async function startAuthConsumer(): Promise<void> {
  consumer = kafka.consumer({ groupId: 'user-org-auth-consumer' });

  await consumer.connect();
  console.log('[Kafka] Auth consumer connected');

  await consumer.subscribe({ topic: Topics.AUTH_USER_REGISTERED, fromBeginning: false });
  console.log(`[Kafka] Subscribed to ${Topics.AUTH_USER_REGISTERED}`);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const value = message.value?.toString();
        if (!value) return;

        const event = JSON.parse(value) as AuthUserRegisteredEvent;
        console.log(`[Kafka] Received ${topic} event for user ${event.userId}`);

        await handleUserRegistered(event);
      } catch (error) {
        console.error('[Kafka] Error processing message:', error);
      }
    },
  });
}

/**
 * Handle USER_REGISTERED event
 * - Creates user profile in user-org-service
 * - If MERCHANT with companyName, auto-creates organization
 */
async function handleUserRegistered(event: AuthUserRegisteredEvent): Promise<void> {
  const { userId, email, role, firstName, lastName, companyName, industry } = event;

  try {
    // 1. Create or find user profile
    let user = await UserRepo.findByAuthUserId(userId);
    if (!user) {
      user = await UserRepo.create({
        authUserId: userId,
        email,
        role,
        firstName,
        lastName,
      } as any);
      console.log(`[UserOrg] Created user profile for ${email}`);
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
 * Gracefully disconnect consumer
 */
export async function disconnectAuthConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    console.log('[Kafka] Auth consumer disconnected');
  }
}
