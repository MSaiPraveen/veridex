import * as crypto from 'crypto';

/**
 * MFA (Multi-Factor Authentication) Service
 * 
 * Provides TOTP-based MFA for admin users.
 * Uses RFC 6238 TOTP algorithm compatible with Google Authenticator.
 */

// TOTP Configuration
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds
const TOTP_ALGORITHM = 'sha1';

// Encryption for storing secrets
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Get the MFA encryption key from environment
 * CRITICAL: This key is required in production to encrypt MFA secrets
 */
function getEncryptionKey(): string {
  const key = process.env.MFA_ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MFA_ENCRYPTION_KEY environment variable is required in production');
    }
    // Only allow fallback in development with a warning
    console.warn('⚠️  WARNING: Using development MFA encryption key. Set MFA_ENCRYPTION_KEY in production!');
    return 'dev-only-key-do-not-use-in-production';
  }
  if (key.length < 32) {
    throw new Error('MFA_ENCRYPTION_KEY must be at least 32 characters long');
  }
  return key;
}

/**
 * Generate a random base32 secret for TOTP
 */
export function generateSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Generate TOTP URI for QR code generation
 */
export function generateTotpUri(
  secret: string, 
  email: string,
  issuer: string = 'Veridex Admin'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/**
 * Verify a TOTP code
 * Allows 1 period window for clock drift
 */
export function verifyTotp(secret: string, code: string): boolean {
  if (!code || code.length !== TOTP_DIGITS) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Check current and adjacent time windows for clock drift
  for (let i = -1; i <= 1; i++) {
    const timeStep = Math.floor((now + i * TOTP_PERIOD) / TOTP_PERIOD);
    const expectedCode = generateTotp(secret, timeStep);
    
    if (expectedCode === code) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate TOTP code for a given time step
 */
function generateTotp(secret: string, timeStep: number): string {
  // Convert secret from base32
  const secretBuffer = base32Decode(secret);
  
  // Convert time step to 8-byte buffer
  const timeBuffer = Buffer.alloc(8);
  let time = timeStep;
  for (let i = 7; i >= 0; i--) {
    timeBuffer[i] = time & 0xff;
    time = Math.floor(time / 256);
  }
  
  // Generate HMAC
  const hmac = crypto.createHmac(TOTP_ALGORITHM, secretBuffer);
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = 
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  
  // Generate code
  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Encrypt MFA secret for database storage
 */
export function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(16);
  const encryptionKey = getEncryptionKey();
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt MFA secret from database storage
 */
export function decryptSecret(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptionKey = getEncryptionKey();
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Verify a backup code and mark it as used
 * Returns the updated backup codes array (with used code removed)
 */
export function verifyBackupCode(
  encryptedCodes: string[], 
  submittedCode: string
): { valid: boolean; remainingCodes: string[] } {
  const normalizedSubmitted = submittedCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  for (let i = 0; i < encryptedCodes.length; i++) {
    try {
      const decrypted = decryptSecret(encryptedCodes[i]);
      const normalizedStored = decrypted.replace(/[^A-Z0-9]/g, '');
      
      if (normalizedStored === normalizedSubmitted) {
        // Remove used code
        const remainingCodes = [...encryptedCodes];
        remainingCodes.splice(i, 1);
        return { valid: true, remainingCodes };
      }
    } catch {
      // Invalid encrypted code, skip
    }
  }
  
  return { valid: false, remainingCodes: encryptedCodes };
}

// Base32 encoding/decoding helpers
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;
  
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  
  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    
    value = (value << 5) | index;
    bits += 5;
    
    while (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  
  return Buffer.from(bytes);
}

/**
 * MFA Setup Response
 */
export interface MfaSetupResponse {
  secret: string;           // Base32 secret (show to user once)
  qrCodeUri: string;        // URI for QR code generation
  backupCodes: string[];    // Backup codes (show to user once)
  encryptedSecret: string;  // Store in database
  encryptedBackupCodes: string[]; // Store in database
}

/**
 * Initialize MFA for a user
 */
export function initializeMfa(email: string): MfaSetupResponse {
  const secret = generateSecret();
  const backupCodes = generateBackupCodes();
  
  return {
    secret,
    qrCodeUri: generateTotpUri(secret, email),
    backupCodes,
    encryptedSecret: encryptSecret(secret),
    encryptedBackupCodes: backupCodes.map(code => encryptSecret(code)),
  };
}

/**
 * Verify MFA for login
 */
export function verifyMfa(
  encryptedSecret: string,
  code: string
): boolean {
  try {
    const secret = decryptSecret(encryptedSecret);
    return verifyTotp(secret, code);
  } catch (error) {
    console.error('MFA verification error:', error);
    return false;
  }
}
