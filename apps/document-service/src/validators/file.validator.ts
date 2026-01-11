/**
 * File Validation Module for Document Service
 * 
 * Provides comprehensive file type validation, MIME type checking,
 * and file content verification for document uploads.
 */

import fs from 'fs';
import path from 'path';
import { ValidationError, FileUploadError } from '../errors/service.errors';

// ================== ALLOWED FILE TYPES ==================

/**
 * Allowed MIME types for document uploads
 * Maps MIME types to their file extensions and category
 */
export const ALLOWED_MIME_TYPES: Record<string, { extensions: string[]; category: 'pdf' | 'image' | 'document' }> = {
  // PDF documents
  'application/pdf': { extensions: ['.pdf'], category: 'pdf' },
  
  // Image formats (for scanned documents)
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], category: 'image' },
  'image/png': { extensions: ['.png'], category: 'image' },
  'image/tiff': { extensions: ['.tiff', '.tif'], category: 'image' },
  'image/bmp': { extensions: ['.bmp'], category: 'image' },
  'image/webp': { extensions: ['.webp'], category: 'image' },
};

/**
 * File magic bytes (signatures) for content verification
 * Used to detect actual file type regardless of extension/MIME
 */
export const FILE_SIGNATURES: Record<string, { bytes: number[]; offset?: number; mimeType: string }[]> = {
  pdf: [{ bytes: [0x25, 0x50, 0x44, 0x46], mimeType: 'application/pdf' }], // %PDF
  jpeg: [
    { bytes: [0xFF, 0xD8, 0xFF, 0xE0], mimeType: 'image/jpeg' },
    { bytes: [0xFF, 0xD8, 0xFF, 0xE1], mimeType: 'image/jpeg' },
    { bytes: [0xFF, 0xD8, 0xFF, 0xE8], mimeType: 'image/jpeg' },
  ],
  png: [{ bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], mimeType: 'image/png' }],
  tiff: [
    { bytes: [0x49, 0x49, 0x2A, 0x00], mimeType: 'image/tiff' }, // Little-endian
    { bytes: [0x4D, 0x4D, 0x00, 0x2A], mimeType: 'image/tiff' }, // Big-endian
  ],
  bmp: [{ bytes: [0x42, 0x4D], mimeType: 'image/bmp' }],
  webp: [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: 'image/webp' }], // RIFF (check WEBP at offset 8)
};

// ================== FILE SIZE LIMITS ==================

export const FILE_SIZE_LIMITS = {
  MIN_SIZE: 1024, // 1KB minimum (to reject empty/corrupt files)
  MAX_SIZE: 50 * 1024 * 1024, // 50MB maximum
  MAX_IMAGE_SIZE: 25 * 1024 * 1024, // 25MB for images
  MAX_PDF_SIZE: 50 * 1024 * 1024, // 50MB for PDFs
};

// ================== VALIDATION RESULT ==================

export interface FileValidationResult {
  isValid: boolean;
  mimeType: string;
  category: 'pdf' | 'image' | 'document';
  extension: string;
  fileSize: number;
  errors: string[];
}

export interface FileValidationError {
  code: string;
  message: string;
  field?: string;
}

// ================== VALIDATION FUNCTIONS ==================

/**
 * Validates file MIME type against allowed types
 */
export function validateMimeType(mimeType: string): { isValid: boolean; category?: 'pdf' | 'image' | 'document'; error?: string } {
  const normalizedMime = mimeType.toLowerCase().trim();
  
  if (!ALLOWED_MIME_TYPES[normalizedMime]) {
    const allowedTypes = Object.keys(ALLOWED_MIME_TYPES).join(', ');
    return {
      isValid: false,
      error: `Unsupported file type: ${mimeType}. Allowed types: ${allowedTypes}`,
    };
  }
  
  return {
    isValid: true,
    category: ALLOWED_MIME_TYPES[normalizedMime].category,
  };
}

/**
 * Validates file extension matches the declared MIME type
 */
export function validateExtension(filename: string, declaredMimeType: string): { isValid: boolean; error?: string } {
  const ext = path.extname(filename).toLowerCase();
  const mimeConfig = ALLOWED_MIME_TYPES[declaredMimeType.toLowerCase()];
  
  if (!mimeConfig) {
    return { isValid: false, error: `Unknown MIME type: ${declaredMimeType}` };
  }
  
  if (!mimeConfig.extensions.includes(ext)) {
    return {
      isValid: false,
      error: `File extension ${ext} does not match declared type ${declaredMimeType}. Expected: ${mimeConfig.extensions.join(', ')}`,
    };
  }
  
  return { isValid: true };
}

/**
 * Validates file size against limits
 */
export function validateFileSize(size: number, mimeType: string): { isValid: boolean; error?: string } {
  if (size < FILE_SIZE_LIMITS.MIN_SIZE) {
    return {
      isValid: false,
      error: `File is too small (${size} bytes). Minimum size: ${FILE_SIZE_LIMITS.MIN_SIZE} bytes. File may be empty or corrupt.`,
    };
  }
  
  const mimeConfig = ALLOWED_MIME_TYPES[mimeType.toLowerCase()];
  const maxSize = mimeConfig?.category === 'image' ? FILE_SIZE_LIMITS.MAX_IMAGE_SIZE : FILE_SIZE_LIMITS.MAX_PDF_SIZE;
  
  if (size > maxSize) {
    return {
      isValid: false,
      error: `File is too large (${Math.round(size / 1024 / 1024)}MB). Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }
  
  return { isValid: true };
}

/**
 * Verifies file content by checking magic bytes
 * This prevents MIME type spoofing attacks
 */
export async function verifyFileContent(filePath: string, declaredMimeType: string): Promise<{ isValid: boolean; detectedType?: string; error?: string }> {
  try {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    // Find matching signature
    for (const [, signatures] of Object.entries(FILE_SIGNATURES)) {
      for (const sig of signatures) {
        const offset = sig.offset || 0;
        const matches = sig.bytes.every((byte, index) => buffer[offset + index] === byte);
        
        if (matches) {
          // Special case for WEBP - need to check WEBP marker at offset 8
          if (sig.mimeType === 'image/webp') {
            const webpMarker = buffer.slice(8, 12).toString('ascii');
            if (webpMarker !== 'WEBP') {
              continue;
            }
          }
          
          if (sig.mimeType === declaredMimeType.toLowerCase()) {
            return { isValid: true, detectedType: sig.mimeType };
          } else {
            return {
              isValid: false,
              detectedType: sig.mimeType,
              error: `File content mismatch. Declared: ${declaredMimeType}, Detected: ${sig.mimeType}`,
            };
          }
        }
      }
    }
    
    return {
      isValid: false,
      error: `Unable to verify file content. File may be corrupt or in an unsupported format.`,
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: `Failed to read file for verification: ${error.message}`,
    };
  }
}

/**
 * Checks if file is potentially corrupt or empty
 */
export function checkFileIntegrity(filePath: string): { isValid: boolean; error?: string } {
  try {
    if (!fs.existsSync(filePath)) {
      return { isValid: false, error: 'File not found on disk' };
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return { isValid: false, error: 'File is empty (0 bytes)' };
    }
    
    // Try to read first few bytes to ensure file is accessible
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    const bytesRead = fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    
    if (bytesRead === 0) {
      return { isValid: false, error: 'Unable to read file content' };
    }
    
    return { isValid: true };
  } catch (error: any) {
    return { isValid: false, error: `File integrity check failed: ${error.message}` };
  }
}

/**
 * Comprehensive file validation that runs all checks
 */
export async function validateUploadedFile(
  filePath: string,
  filename: string,
  declaredMimeType: string,
  fileSize: number
): Promise<FileValidationResult> {
  const errors: string[] = [];
  let category: 'pdf' | 'image' | 'document' = 'document';
  
  // 1. Validate MIME type
  const mimeResult = validateMimeType(declaredMimeType);
  if (!mimeResult.isValid) {
    errors.push(mimeResult.error!);
  } else {
    category = mimeResult.category!;
  }
  
  // 2. Validate extension matches MIME type
  const extResult = validateExtension(filename, declaredMimeType);
  if (!extResult.isValid) {
    errors.push(extResult.error!);
  }
  
  // 3. Validate file size
  const sizeResult = validateFileSize(fileSize, declaredMimeType);
  if (!sizeResult.isValid) {
    errors.push(sizeResult.error!);
  }
  
  // 4. Check file integrity
  const integrityResult = checkFileIntegrity(filePath);
  if (!integrityResult.isValid) {
    errors.push(integrityResult.error!);
  }
  
  // 5. Verify file content (magic bytes)
  if (errors.length === 0) {
    const contentResult = await verifyFileContent(filePath, declaredMimeType);
    if (!contentResult.isValid) {
      errors.push(contentResult.error!);
    }
  }
  
  return {
    isValid: errors.length === 0,
    mimeType: declaredMimeType,
    category,
    extension: path.extname(filename).toLowerCase(),
    fileSize,
    errors,
  };
}

/**
 * Throws appropriate error if validation fails
 */
export async function assertValidFile(
  filePath: string,
  filename: string,
  mimeType: string,
  fileSize: number
): Promise<void> {
  const result = await validateUploadedFile(filePath, filename, mimeType, fileSize);
  
  if (!result.isValid) {
    // Clean up the invalid file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore cleanup errors
    }
    
    throw new FileUploadError(result.errors.join('; '));
  }
}

/**
 * Get human-readable list of allowed file types
 */
export function getAllowedFileTypesDescription(): string {
  const types: string[] = [];
  
  for (const [mime, config] of Object.entries(ALLOWED_MIME_TYPES)) {
    types.push(`${config.extensions.join('/')} (${mime})`);
  }
  
  return types.join(', ');
}
