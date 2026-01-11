import { Kafka, Producer } from 'kafkajs';
import { TOPICS } from '@veridex/event-contracts';
import { env } from '../config/env';
import { IUser } from '../domain/user.entity';
import { IOrganization } from '../domain/organization.entity';
import { IMembership } from '../domain/membership.entity';

const kafka = new Kafka({
  clientId: 'user-org-service',
  brokers: [env.KAFKA_BROKER],
});

// Singleton producer pattern
let producer: Producer | null = null;
let isConnected = false;

async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer();
  }
  
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('[UserOrg Producer] Connected to Kafka');
  }
  
  return producer;
}

export async function disconnectProducer(): Promise<void> {
  if (producer && isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('[UserOrg Producer] Disconnected from Kafka');
  }
}

// ================== USER EVENTS ==================

export async function emitUserCreated(user: IUser): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.USER_PROFILE_CREATED,
      messages: [{
        key: user._id?.toString(),
        value: JSON.stringify({
          eventType: 'USER_PROFILE_CREATED',
          timestamp: new Date().toISOString(),
          data: {
            userId: user._id,
            authUserId: user.authUserId,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        }),
      }],
    });
    console.log(`[UserOrg Producer] Emitted USER_PROFILE_CREATED for ${user.email}`);
  } catch (error) {
    console.error('[UserOrg Producer] Failed to emit USER_PROFILE_CREATED:', error);
  }
}

export async function emitUserUpdated(user: IUser): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.USER_PROFILE_UPDATED,
      messages: [{
        key: user._id?.toString(),
        value: JSON.stringify({
          eventType: 'USER_PROFILE_UPDATED',
          timestamp: new Date().toISOString(),
          data: {
            userId: user._id,
            authUserId: user.authUserId,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
          },
        }),
      }],
    });
    console.log(`[UserOrg Producer] Emitted USER_PROFILE_UPDATED for ${user.email}`);
  } catch (error) {
    console.error('[UserOrg Producer] Failed to emit USER_PROFILE_UPDATED:', error);
  }
}

// ================== ORGANIZATION EVENTS ==================

export async function emitOrganizationCreated(org: IOrganization): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.ORG_CREATED,
      messages: [{
        key: org._id?.toString(),
        value: JSON.stringify({
          eventType: 'ORG_CREATED',
          timestamp: new Date().toISOString(),
          data: {
            organizationId: org._id,
            name: org.name,
            type: org.type,
          },
        }),
      }],
    });
    console.log(`[UserOrg Producer] Emitted ORG_CREATED for ${org.name}`);
  } catch (error) {
    console.error('[UserOrg Producer] Failed to emit ORG_CREATED:', error);
  }
}

export async function emitOrganizationUpdated(org: IOrganization): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.ORG_UPDATED,
      messages: [{
        key: org._id?.toString(),
        value: JSON.stringify({
          eventType: 'ORG_UPDATED',
          timestamp: new Date().toISOString(),
          data: {
            organizationId: org._id,
            name: org.name,
            type: org.type,
            isActive: org.isActive,
            isVerified: org.isVerified,
          },
        }),
      }],
    });
    console.log(`[UserOrg Producer] Emitted ORG_UPDATED for ${org.name}`);
  } catch (error) {
    console.error('[UserOrg Producer] Failed to emit ORG_UPDATED:', error);
  }
}

// ================== MEMBERSHIP EVENTS ==================

export async function emitMemberAdded(membership: IMembership, org: IOrganization): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.ORG_MEMBER_ADDED,
      messages: [{
        key: membership._id?.toString(),
        value: JSON.stringify({
          eventType: 'ORG_MEMBER_ADDED',
          timestamp: new Date().toISOString(),
          data: {
            membershipId: membership._id,
            userId: membership.userId,
            organizationId: membership.organizationId,
            organizationName: org.name,
            role: membership.role,
            status: membership.status,
          },
        }),
      }],
    });
    console.log(`[UserOrg Producer] Emitted ORG_MEMBER_ADDED for org ${org.name}`);
  } catch (error) {
    console.error('[UserOrg Producer] Failed to emit ORG_MEMBER_ADDED:', error);
  }
}

export async function emitMemberRemoved(membership: IMembership, org: IOrganization): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.ORG_MEMBER_REMOVED,
      messages: [{
        key: membership._id?.toString(),
        value: JSON.stringify({
          eventType: 'ORG_MEMBER_REMOVED',
          timestamp: new Date().toISOString(),
          data: {
            membershipId: membership._id,
            userId: membership.userId,
            organizationId: membership.organizationId,
            organizationName: org.name,
          },
        }),
      }],
    });
    console.log(`[UserOrg Producer] Emitted ORG_MEMBER_REMOVED for org ${org.name}`);
  } catch (error) {
    console.error('[UserOrg Producer] Failed to emit ORG_MEMBER_REMOVED:', error);
  }
}
