/**
 * Environment Variable Utilities
 * 
 * Production-grade utilities for managing environment variables with
 * strict validation and security best practices.
 */

// Known weak/default secrets that should never be used in production
const KNOWN_WEAK_SECRETS = [
  'secret',
  'password',
  'changeme',
  'change-me',
  'change_me',
  'admin',
  'test',
  'dev',
  'development',
  'access_secret',
  'refresh_secret',
  'jwt-secret',
  'jwt_secret',
  'admin-jwt-secret-change-in-production',
  'admin-refresh-secret-change-in-production',
  'admin-cookie-secret-change-me',
  'internal-service-key',
];

/**
 * Check if a secret value appears to be a weak/default value
 */
function isWeakSecret(value: string): boolean {
  const lowerValue = value.toLowerCase();
  
  // Check against known weak secrets
  if (KNOWN_WEAK_SECRETS.some(weak => lowerValue.includes(weak))) {
    return true;
  }
  
  // Check if it's too short (less than 32 characters for secrets)
  if (value.length < 32) {
    return true;
  }
  
  return false;
}

/**
 * Require an environment variable to be set.
 * Throws an error if the variable is missing.
 * 
 * @param name - The name of the environment variable
 * @param devDefault - Optional default value for development only
 * @returns The value of the environment variable
 */
export function requireEnv(name: string, devDefault?: string): string {
  const value = process.env[name];
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!value) {
    if (isProduction) {
      throw new Error(
        `FATAL: Missing required environment variable: ${name}. ` +
        `Application cannot start in production without this value.`
      );
    }
    
    if (devDefault !== undefined) {
      console.warn(
        `[ENV] Using development default for ${name}. ` +
        `This will NOT work in production.`
      );
      return devDefault;
    }
    
    throw new Error(`Missing required environment variable: ${name}`);
  }
  
  return value;
}

/**
 * Require a secret environment variable to be set.
 * In production, also validates that the secret is not a known weak value.
 * 
 * @param name - The name of the secret environment variable
 * @param devDefault - Optional default value for development only
 * @returns The secret value
 */
export function requireSecret(name: string, devDefault?: string): string {
  const value = process.env[name];
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!value) {
    if (isProduction) {
      throw new Error(
        `FATAL: Missing required secret: ${name}. ` +
        `Application cannot start in production without this secret.`
      );
    }
    
    if (devDefault !== undefined) {
      console.warn(
        `[ENV] Using development default for secret ${name}. ` +
        `This will NOT work in production.`
      );
      return devDefault;
    }
    
    throw new Error(`Missing required secret: ${name}`);
  }
  
  // In production, validate secret strength
  if (isProduction && isWeakSecret(value)) {
    throw new Error(
      `FATAL: Secret ${name} appears to be a weak or default value. ` +
      `Production secrets must be at least 32 characters and not contain ` +
      `common weak patterns. Generate a strong secret with: ` +
      `openssl rand -base64 48`
    );
  }
  
  return value;
}

/**
 * Get an optional environment variable with a default value.
 * 
 * @param name - The name of the environment variable
 * @param defaultValue - Default value if not set
 * @returns The value or default
 */
export function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Get an optional environment variable as a number.
 * 
 * @param name - The name of the environment variable
 * @param defaultValue - Default value if not set
 * @returns The numeric value or default
 */
export function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  
  const parsed = Number(value);
  if (isNaN(parsed)) {
    console.warn(`[ENV] ${name} is not a valid number, using default: ${defaultValue}`);
    return defaultValue;
  }
  
  return parsed;
}

/**
 * Get an optional environment variable as a boolean.
 * 
 * @param name - The name of the environment variable
 * @param defaultValue - Default value if not set
 * @returns The boolean value or default
 */
export function getEnvBoolean(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get an environment variable as an array (comma-separated).
 * 
 * @param name - The name of the environment variable
 * @param defaultValue - Default value if not set
 * @returns The array of values
 */
export function getEnvArray(name: string, defaultValue: string[] = []): string[] {
  const value = process.env[name];
  if (!value) return defaultValue;
  
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Validate that the application is properly configured for production.
 * Call this during startup to catch configuration issues early.
 * 
 * @param requiredSecrets - List of secret names that must be set
 * @param requiredEnvVars - List of env var names that must be set
 */
export function validateProductionConfig(
  requiredSecrets: string[],
  requiredEnvVars: string[]
): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  
  for (const secret of requiredSecrets) {
    try {
      requireSecret(secret);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  
  for (const envVar of requiredEnvVars) {
    try {
      requireEnv(envVar);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  
  if (errors.length > 0) {
    const message = [
      `Configuration validation failed with ${errors.length} error(s):`,
      ...errors.map((e, i) => `  ${i + 1}. ${e}`),
    ].join('\n');
    
    if (isProduction) {
      throw new Error(message);
    } else {
      console.warn(`[ENV] ${message}`);
    }
  }
}
