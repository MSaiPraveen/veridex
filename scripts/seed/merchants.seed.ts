import { log } from '../utils/logger';
import { connect } from '../utils/mongo';
import { DB_URIS } from '../config/env';
import { getAuthUserModel, getUserProfileModel, getOrganizationModel, getMembershipModel } from './schemas';
import { MERCHANTS, ADMIN_USER, hashPassword } from './data';

/**
 * Merchant Seed
 * 
 * Creates merchant users, organizations, and an admin user.
 * 
 * Responsibilities:
 * - Create merchant users in auth DB
 * - Create user profiles in user-org DB
 * - Create organizations in user-org DB
 * - Create user ↔ organization memberships
 * - Create one admin user
 * 
 * Dependencies: consumers.seed.ts (runs after)
 */

// Track created data for downstream seeds
export const createdMerchantIds: string[] = [];
export const createdOrganizations: Map<string, string> = new Map(); // name -> id

export async function seedMerchants(): Promise<void> {
  log.step('Connecting to databases...');
  
  const authDb = await connect('auth', DB_URIS.auth);
  const userOrgDb = await connect('userOrg', DB_URIS.userOrg);

  const AuthUser = getAuthUserModel(authDb);
  const UserProfile = getUserProfileModel(userOrgDb);
  const Organization = getOrganizationModel(userOrgDb);
  const Membership = getMembershipModel(userOrgDb);

  log.step('Clearing existing merchant/admin data...');
  
  const merchantEmails = MERCHANTS.map(m => m.email);
  const allEmails = [...merchantEmails, ADMIN_USER.email];
  
  await AuthUser.deleteMany({ email: { $in: allEmails } });
  await UserProfile.deleteMany({ email: { $in: allEmails } });
  
  // Clear organizations and memberships
  const orgNames = [...new Set(MERCHANTS.map(m => m.organizationName))];
  await Organization.deleteMany({ name: { $in: orgNames } });
  await Membership.deleteMany({});

  // Create organizations first
  log.step(`Creating ${orgNames.length} organizations...`);
  
  for (const orgName of orgNames) {
    const org = await Organization.create({
      name: orgName,
      type: 'MERCHANT',
      isActive: true,
    });
    
    createdOrganizations.set(orgName, String(org._id));
    log.info(`Created organization: ${orgName}`);
  }

  // Create merchant users
  log.step(`Creating ${MERCHANTS.length} merchants...`);
  
  let merchantsCreated = 0;
  let membershipsCreated = 0;

  for (const merchant of MERCHANTS) {
    const passwordHash = await hashPassword(merchant.password);
    
    // Auth record
    const authUser = await AuthUser.create({
      email: merchant.email,
      passwordHash,
      role: 'MERCHANT',
      isActive: true,
    });

    const authUserId = String(authUser._id);
    createdMerchantIds.push(authUserId);

    // User profile
    const userProfile = await UserProfile.create({
      authUserId,
      email: merchant.email,
      role: 'MERCHANT',
      firstName: merchant.firstName,
      lastName: merchant.lastName,
      isActive: true,
    });

    // Membership
    const orgId = createdOrganizations.get(merchant.organizationName)!;
    await Membership.create({
      userId: String(userProfile._id),
      organizationId: orgId,
      role: merchant.membershipRole,
    });

    merchantsCreated++;
    membershipsCreated++;
    log.info(`Created merchant: ${merchant.email} (${merchant.membershipRole} @ ${merchant.organizationName})`);
  }

  // Create admin user
  log.step('Creating admin user...');
  
  const adminPasswordHash = await hashPassword(ADMIN_USER.password);
  
  const adminAuthUser = await AuthUser.create({
    email: ADMIN_USER.email,
    passwordHash: adminPasswordHash,
    role: 'SUPER_ADMIN',
    isActive: true,
  });

  await UserProfile.create({
    authUserId: String(adminAuthUser._id),
    email: ADMIN_USER.email,
    role: 'SUPER_ADMIN',
    firstName: ADMIN_USER.firstName,
    lastName: ADMIN_USER.lastName,
    isActive: true,
  });

  log.info(`Created admin: ${ADMIN_USER.email}`);

  log.count('Organizations created', orgNames.length);
  log.count('Merchants created', merchantsCreated);
  log.count('Memberships created', membershipsCreated);
  log.count('Admins created', 1);
}
