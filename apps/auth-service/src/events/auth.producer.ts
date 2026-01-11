import { Kafka, Producer, logLevel } from 'kafkajs';
import { env } from '../config/env';
import {
  Topics,
  authUserRegisteredEventSchema,
  authUserLoggedInEventSchema,
  authUserLoggedOutEventSchema,
  validateEventForPublish,
  enrichEvent,
  type AuthUserRegisteredEvent,
  type AuthUserLoggedInEvent,
  type AuthUserLoggedOutEvent,
} from '@veridex/event-contracts';

const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: [env.KAFKA_BROKER],
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 100,
    retries: 3,
  },
});

let producer: Producer | null = null;
let isConnected = false;
let isConnecting = false;

/**
 * Get or create Kafka producer (singleton)
 */
async function getProducer(): Promise<Producer> {
  if (producer && isConnected) {
    return producer;
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    await new Promise(resolve => setTimeout(resolve, 100));
    return getProducer();
  }

  isConnecting = true;
  
  try {
    producer = kafka.producer();
    await producer.connect();
    isConnected = true;
    console.log('[Kafka] Producer connected');
    
    // Handle disconnection
    producer.on('producer.disconnect', () => {
      isConnected = false;
      console.log('[Kafka] Producer disconnected');
    });
    
    return producer;
  } catch (error) {
    console.error('[Kafka] Failed to connect producer:', error);
    isConnecting = false;
    throw error;
  } finally {
    isConnecting = false;
  }
}

/**
 * Gracefully disconnect producer
 */
export async function disconnectProducer(): Promise<void> {
  if (producer && isConnected) {
    await producer.disconnect();
    producer = null;
    isConnected = false;
    console.log('[Kafka] Producer disconnected gracefully');
  }
}

/**
 * Emit user registered event
 */
export async function emitUserRegistered(
  userId: string,
  email: string,
  role: string,
  options?: { 
    firstName?: string; 
    lastName?: string; 
    organizationId?: string;
    companyName?: string;
    industry?: string;
  }
): Promise<void> {
  try {
    const prod = await getProducer();
    
    // Build and validate event
    const eventData = enrichEvent({
      userId,
      email,
      role: role as 'ADMIN' | 'MERCHANT' | 'CONSUMER',
      firstName: options?.firstName,
      lastName: options?.lastName,
      organizationId: options?.organizationId,
      companyName: options?.companyName,
      industry: options?.industry,
    }, 'auth-service');

    const event = validateEventForPublish(
      authUserRegisteredEventSchema,
      eventData,
      Topics.AUTH_USER_REGISTERED
    );

    await prod.send({
      topic: Topics.AUTH_USER_REGISTERED,
      messages: [
        {
          key: userId,
          value: JSON.stringify(event),
        },
      ],
    });
    
    console.log(`[Kafka] Emitted ${Topics.AUTH_USER_REGISTERED} for user ${userId}`);
  } catch (error) {
    console.error('[Kafka] Failed to emit user registered event:', error);
    // Don't throw - events are fire-and-forget
  }
}

/**
 * Emit user logged in event
 */
export async function emitUserLoggedIn(
  userId: string,
  options?: { email?: string; ipAddress?: string; userAgent?: string; sessionId?: string }
): Promise<void> {
  try {
    const prod = await getProducer();
    
    // Build and validate event
    const eventData = enrichEvent({
      userId,
      email: options?.email,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      sessionId: options?.sessionId,
    }, 'auth-service');

    const event = validateEventForPublish(
      authUserLoggedInEventSchema,
      eventData,
      Topics.AUTH_USER_LOGGED_IN
    );

    await prod.send({
      topic: Topics.AUTH_USER_LOGGED_IN,
      messages: [
        {
          key: userId,
          value: JSON.stringify(event),
        },
      ],
    });
    
    console.log(`[Kafka] Emitted ${Topics.AUTH_USER_LOGGED_IN} for user ${userId}`);
  } catch (error) {
    console.error('[Kafka] Failed to emit login event:', error);
  }
}

/**
 * Emit user logged out event
 */
export async function emitUserLoggedOut(
  userId: string,
  allDevices: boolean,
  options?: { sessionId?: string; reason?: 'user_initiated' | 'session_expired' | 'forced' | 'password_changed' }
): Promise<void> {
  try {
    const prod = await getProducer();
    
    // Build and validate event
    const eventData = enrichEvent({
      userId,
      allDevices,
      sessionId: options?.sessionId,
      reason: options?.reason || 'user_initiated',
    }, 'auth-service');

    const event = validateEventForPublish(
      authUserLoggedOutEventSchema,
      eventData,
      Topics.AUTH_USER_LOGGED_OUT
    );

    await prod.send({
      topic: Topics.AUTH_USER_LOGGED_OUT,
      messages: [
        {
          key: userId,
          value: JSON.stringify(event),
        },
      ],
    });
    
    console.log(`[Kafka] Emitted ${Topics.AUTH_USER_LOGGED_OUT} for user ${userId}`);
  } catch (error) {
    console.error('[Kafka] Failed to emit logout event:', error);
  }
}
