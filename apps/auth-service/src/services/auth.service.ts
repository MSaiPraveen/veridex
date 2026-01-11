import * as bcrypt from 'bcrypt';
import { UserRepo } from '../repositories/user.repository';
import { 
  generateTokens, 
  refreshTokens as refreshTokensService,
  revokeToken,
  revokeAllUserTokens,
  AuthTokens,
  TokenContext,
} from './token.service';
import { 
  InvalidCredentialsError, 
  UserExistsError,
  AccountLockedError,
  AccountDisabledError,
  InvalidTokenError,
} from '../errors/auth.errors';
import { LoginInput, RegisterInput, LogoutInput } from '../schemas/auth.schemas';
import { IUser } from '../domain/user.entity';
import { emitUserRegistered, emitUserLoggedIn, emitUserLoggedOut } from '../events/auth.producer';
import { Role } from '@veridex/roles-permissions';

const BCRYPT_ROUNDS = 12;

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  tokens: AuthTokens;
}

/**
 * Register a new user
 */
export async function register(
  input: RegisterInput,
  context?: TokenContext
): Promise<AuthResponse> {
  // Check if user already exists
  const existingUser = await UserRepo.existsByEmail(input.email);
  if (existingUser) {
    throw new UserExistsError();
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // For merchants, use company name as firstName if not provided
  const firstName = input.firstName || input.companyName;

  // Create the user
  const user = await UserRepo.create({
    email: input.email,
    passwordHash,
    role: input.role,
    firstName: firstName,
    lastName: input.lastName,
  });

  // Generate tokens
  const tokens = await generateTokens(user, context);

  // Emit registration event with merchant-specific data
  emitUserRegistered(String(user._id), user.email, user.role, {
    firstName: user.firstName,
    lastName: user.lastName,
    // Include merchant info so user-org-service can create organization
    companyName: input.companyName,
    industry: input.industry,
  }).catch(console.error);

  return {
    user: {
      ...formatUserResponse(user),
      companyName: input.companyName,
    },
    tokens,
  };
}

/**
 * Login with email and password
 */
export async function login(
  input: LoginInput,
  context?: TokenContext
): Promise<AuthResponse> {
  // Find user by email
  const user = await UserRepo.findByEmail(input.email);
  if (!user) {
    throw new InvalidCredentialsError();
  }

  // Check if account is disabled
  if (!user.isActive) {
    throw new AccountDisabledError();
  }

  // Check if account is locked
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    throw new AccountLockedError();
  }

  // Verify password
  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    // Increment failed attempts
    await UserRepo.incrementFailedAttempts(String(user._id));
    throw new InvalidCredentialsError();
  }

  // Update login success (reset failed attempts, update lastLoginAt)
  await UserRepo.updateLoginSuccess(String(user._id));

  // Generate tokens
  const tokens = await generateTokens(user, context);

  // Emit login event (fire and forget)
  emitUserLoggedIn(String(user._id), {
    email: user.email,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
  }).catch(console.error);

  return {
    user: formatUserResponse(user),
    tokens,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshTokens(
  refreshToken: string,
  context?: TokenContext
): Promise<AuthTokens> {
  return refreshTokensService(refreshToken, context);
}

/**
 * Logout - revoke refresh token(s)
 */
export async function logout(
  input: LogoutInput,
  userId?: string
): Promise<{ revokedCount: number }> {
  let revokedCount = 0;

  if (input.allDevices && userId) {
    // Revoke all tokens for the user
    revokedCount = await revokeAllUserTokens(userId);
    
    // Emit logout event
    emitUserLoggedOut(userId, true).catch(console.error);
  } else {
    // Revoke only the provided token
    const success = await revokeToken(input.refreshToken);
    revokedCount = success ? 1 : 0;
    
    if (userId) {
      emitUserLoggedOut(userId, false).catch(console.error);
    }
  }

  return { revokedCount };
}

/**
 * Get current user by ID
 */
export async function getCurrentUser(userId: string): Promise<IUser | null> {
  return UserRepo.findById(userId);
}

/**
 * Format user object for API response (exclude sensitive fields)
 */
function formatUserResponse(user: IUser) {
  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    organizationId: user.organizationId,
  };
}
