import { log } from '../utils/logger';
import { connect } from '../utils/mongo';
import { DB_URIS } from '../config/env';
import { getAuthUserModel, getUserProfileModel } from './schemas';
import { CONSUMERS, hashPassword } from './data';

/**
 * Consumer Seed
 * 
 * Creates consumer users (non-merchant identities).
 * 
 * Responsibilities:
 * - Create consumer users in auth DB
 * - Create user profiles in user-org DB
 * - No organization associations
 * - CONSUMER role only
 * 
 * Dependencies: None (runs first)
 */

// Track created IDs for downstream seeds
export const createdConsumerIds: string[] = [];

export async function seedConsumers(): Promise<void> {
  log.step('Connecting to databases...');
  
  const authDb = await connect('auth', DB_URIS.auth);
  const userOrgDb = await connect('userOrg', DB_URIS.userOrg);

  const AuthUser = getAuthUserModel(authDb);
  const UserProfile = getUserProfileModel(userOrgDb);

  log.step('Clearing existing consumer data...');
  
  // Only delete consumers, not merchants/admins
  const consumerEmails = CONSUMERS.map(c => c.email);
  await AuthUser.deleteMany({ email: { $in: consumerEmails } });
  await UserProfile.deleteMany({ email: { $in: consumerEmails } });

  log.step(`Creating ${CONSUMERS.length} consumers...`);

  let authCreated = 0;
  let profileCreated = 0;

  for (const consumer of CONSUMERS) {
    // Create auth record
    const passwordHash = await hashPassword(consumer.password);
    
    const authUser = await AuthUser.create({
      email: consumer.email,
      passwordHash,
      role: 'CONSUMER',
      isActive: true,
    });

    const authUserId = String(authUser._id);
    createdConsumerIds.push(authUserId);
    authCreated++;

    // Create user profile
    await UserProfile.create({
      authUserId,
      email: consumer.email,
      role: 'CONSUMER',
      firstName: consumer.firstName,
      lastName: consumer.lastName,
      isActive: true,
    });

    profileCreated++;
    log.info(`Created consumer: ${consumer.email}`);
  }

  log.count('Auth users created', authCreated);
  log.count('Profiles created', profileCreated);
}
