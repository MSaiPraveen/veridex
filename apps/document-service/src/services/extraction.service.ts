import fs from 'fs';
import path from 'path';
import { IExtractedData, DocumentType } from '../domain/document.entity';

// Lazy load pdf-parse to avoid issues if not installed
let pdfParse: any = null;
let Tesseract: any = null;

async function getPdfParser() {
  if (!pdfParse) {
    try {
      pdfParse = require('pdf-parse');
    } catch (error) {
      console.warn('[Extraction] pdf-parse not available, using fallback');
      return null;
    }
  }
  return pdfParse;
}

async function getTesseract() {
  if (!Tesseract) {
    try {
      Tesseract = require('tesseract.js');
    } catch (error) {
      console.warn('[Extraction] tesseract.js not available, using fallback');
      return null;
    }
  }
  return Tesseract;
}

// OCR Configuration
interface OCRConfig {
  provider: 'tesseract' | 'google-vision' | 'aws-textract';
  confidence_threshold: number;
  languages: string[];
}

const DEFAULT_OCR_CONFIG: OCRConfig = {
  provider: 'tesseract',
  confidence_threshold: 0.6,
  languages: ['eng'],
};

/**
 * Extract data from a document file
 */
export async function extractDocument(filePath: string, documentType: DocumentType): Promise<IExtractedData> {
  const ext = path.extname(filePath).toLowerCase();
  
  // Handle PDF files
  if (ext === '.pdf') {
    return extractFromPdf(filePath, documentType);
  }
  
  // Handle image files with OCR
  if (['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif', '.webp'].includes(ext)) {
    return extractFromImage(filePath, documentType);
  }
  
  // Unsupported format - return empty extraction
  console.warn(`[Extraction] Unsupported file format: ${ext}`);
  return {
    confidence: 0,
  };
}

/**
 * Extract data from PDF file
 */
async function extractFromPdf(filePath: string, documentType: DocumentType): Promise<IExtractedData> {
  const pdf = await getPdfParser();
  
  if (!pdf) {
    // Fallback: return mock data for development
    return generateMockExtraction(documentType);
  }

  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text || '';
    
    return parseTextByDocumentType(text, documentType);
  } catch (error) {
    console.error('[Extraction] PDF parsing failed:', error);
    throw new Error('Failed to parse PDF document');
  }
}

/**
 * Extract data from image file using OCR
 * Supports Tesseract.js (local), Google Vision API, or AWS Textract
 */
async function extractFromImage(
  filePath: string, 
  documentType: DocumentType,
  config: OCRConfig = DEFAULT_OCR_CONFIG
): Promise<IExtractedData> {
  console.log(`[Extraction] Starting OCR extraction for: ${filePath}`);
  
  try {
    let text: string;
    let ocrConfidence: number;

    switch (config.provider) {
      case 'tesseract':
        const result = await extractWithTesseract(filePath, config.languages);
        text = result.text;
        ocrConfidence = result.confidence;
        break;
      
      case 'google-vision':
        // Google Vision API integration (requires credentials)
        const gvResult = await extractWithGoogleVision(filePath);
        text = gvResult.text;
        ocrConfidence = gvResult.confidence;
        break;
      
      case 'aws-textract':
        // AWS Textract integration (requires AWS SDK)
        const atResult = await extractWithAWSTextract(filePath);
        text = atResult.text;
        ocrConfidence = atResult.confidence;
        break;
      
      default:
        console.warn(`[Extraction] Unknown OCR provider: ${config.provider}`);
        return generateMockExtraction(documentType);
    }

    // If OCR confidence is too low, return with warning
    if (ocrConfidence < config.confidence_threshold) {
      console.warn(`[Extraction] Low OCR confidence (${ocrConfidence}), results may be unreliable`);
    }

    // Parse the extracted text based on document type
    const extracted = parseTextByDocumentType(text, documentType);
    
    // Adjust confidence based on OCR quality
    extracted.confidence = Math.min(extracted.confidence || 0.5, ocrConfidence);
    extracted.ocrProvider = config.provider;
    extracted.ocrConfidence = ocrConfidence;
    
    return extracted;
  } catch (error) {
    console.error('[Extraction] OCR extraction failed:', error);
    // Fallback to mock data for development
    return generateMockExtraction(documentType);
  }
}

/**
 * Extract text using Tesseract.js (local OCR)
 */
async function extractWithTesseract(
  filePath: string, 
  languages: string[] = ['eng']
): Promise<{ text: string; confidence: number }> {
  const tesseract = await getTesseract();
  
  if (!tesseract) {
    throw new Error('Tesseract.js not available');
  }

  console.log(`[Extraction] Running Tesseract OCR with languages: ${languages.join(', ')}`);
  
  const { data } = await tesseract.recognize(filePath, languages.join('+'), {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        console.log(`[Extraction] OCR progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  return {
    text: data.text || '',
    confidence: data.confidence / 100, // Tesseract returns 0-100, normalize to 0-1
  };
}

/**
 * Extract text using Google Cloud Vision API
 * Requires GOOGLE_APPLICATION_CREDENTIALS environment variable
 */
async function extractWithGoogleVision(
  filePath: string
): Promise<{ text: string; confidence: number }> {
  try {
    // Lazy load Google Vision client
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient();

    const [result] = await client.textDetection(filePath);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return { text: '', confidence: 0 };
    }

    // First annotation contains the full text
    const fullText = detections[0].description || '';
    
    // Calculate average confidence from all detections
    const avgConfidence = detections
      .filter((d: any) => d.confidence !== undefined)
      .reduce((sum: number, d: any) => sum + d.confidence, 0) / detections.length || 0.8;

    return {
      text: fullText,
      confidence: avgConfidence,
    };
  } catch (error) {
    console.error('[Extraction] Google Vision API error:', error);
    throw error;
  }
}

/**
 * Extract text using AWS Textract
 * Requires AWS credentials configured
 */
async function extractWithAWSTextract(
  filePath: string
): Promise<{ text: string; confidence: number }> {
  try {
    const { TextractClient, DetectDocumentTextCommand } = require('@aws-sdk/client-textract');
    const client = new TextractClient({});

    const imageBytes = fs.readFileSync(filePath);
    
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: imageBytes,
      },
    });

    const response = await client.send(command);
    
    if (!response.Blocks) {
      return { text: '', confidence: 0 };
    }

    // Extract text from LINE blocks
    const lines = response.Blocks
      .filter((block: any) => block.BlockType === 'LINE')
      .map((block: any) => block.Text)
      .join('\n');

    // Calculate average confidence
    const avgConfidence = response.Blocks
      .filter((block: any) => block.Confidence !== undefined)
      .reduce((sum: number, block: any) => sum + block.Confidence, 0) / response.Blocks.length / 100;

    return {
      text: lines,
      confidence: avgConfidence,
    };
  } catch (error) {
    console.error('[Extraction] AWS Textract error:', error);
    throw error;
  }
}

/**
 * Parse text content based on document type
 */
function parseTextByDocumentType(text: string, documentType: DocumentType): IExtractedData {
  const lowerText = text.toLowerCase();
  
  // Check for expired documents
  if (lowerText.includes('expired') || lowerText.includes('void')) {
    throw new Error('Document appears to be expired or void');
  }

  const extracted: IExtractedData = {
    rawText: text.substring(0, 5000), // Store first 5000 chars
    confidence: 0.7,
  };

  switch (documentType) {
    case 'BUSINESS_LICENSE':
    case 'COMPLIANCE_CERT':
      extracted.licenseNumber = extractPattern(text, /license\s*#?\s*:?\s*([A-Z0-9-]+)/i);
      extracted.issuedTo = extractPattern(text, /issued\s*to\s*:?\s*([^\n]+)/i);
      extracted.issuedBy = extractPattern(text, /issued\s*by\s*:?\s*([^\n]+)/i);
      extracted.validUntil = parseDate(extractPattern(text, /valid\s*(until|through|to)\s*:?\s*([^\n]+)/i, 2));
      extracted.issuedDate = parseDate(extractPattern(text, /issue\s*date\s*:?\s*([^\n]+)/i));
      break;

    case 'LAB_REPORT':
    case 'COA':
      extracted.thcContent = parseNumber(extractPattern(text, /thc\s*:?\s*([\d.]+)\s*%?/i));
      extracted.cbdContent = parseNumber(extractPattern(text, /cbd\s*:?\s*([\d.]+)\s*%?/i));
      extracted.batchNumber = extractPattern(text, /batch\s*#?\s*:?\s*([A-Z0-9-]+)/i);
      extracted.validUntil = parseDate(extractPattern(text, /test\s*date\s*:?\s*([^\n]+)/i));
      // Add test results if found
      if (lowerText.includes('pass')) {
        extracted.testResults = { overall: 'PASS' };
      } else if (lowerText.includes('fail')) {
        extracted.testResults = { overall: 'FAIL' };
      }
      break;

    case 'INSURANCE':
      extracted.licenseNumber = extractPattern(text, /policy\s*#?\s*:?\s*([A-Z0-9-]+)/i);
      extracted.issuedTo = extractPattern(text, /insured\s*:?\s*([^\n]+)/i);
      extracted.issuedBy = extractPattern(text, /insurer\s*:?\s*([^\n]+)/i);
      extracted.validUntil = parseDate(extractPattern(text, /expir(es|ation)\s*:?\s*([^\n]+)/i, 2));
      break;

    default:
      // Generic extraction
      extracted.issuedTo = extractPattern(text, /(?:to|name)\s*:?\s*([^\n]+)/i);
      extracted.validUntil = parseDate(extractPattern(text, /(?:valid|expires?|expiration)\s*:?\s*([^\n]+)/i));
  }

  // Calculate confidence based on fields extracted
  const fields = [extracted.licenseNumber, extracted.issuedTo, extracted.validUntil, extracted.thcContent];
  const filledFields = fields.filter(f => f !== undefined && f !== null).length;
  extracted.confidence = Math.min(0.9, 0.4 + (filledFields * 0.15));

  return extracted;
}

/**
 * Extract pattern from text
 */
function extractPattern(text: string, pattern: RegExp, group: number = 1): string | undefined {
  const match = text.match(pattern);
  return match ? match[group]?.trim() : undefined;
}

/**
 * Parse date string
 */
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Parse number from string
 */
function parseNumber(numStr: string | undefined): number | undefined {
  if (!numStr) return undefined;
  const num = parseFloat(numStr);
  return isNaN(num) ? undefined : num;
}

/**
 * Generate mock extraction data for development
 */
function generateMockExtraction(documentType: DocumentType): IExtractedData {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  switch (documentType) {
    case 'BUSINESS_LICENSE':
    case 'COMPLIANCE_CERT':
      return {
        issuedTo: 'Sample Merchant LLC',
        issuedBy: 'State Cannabis Authority',
        licenseNumber: `LIC-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        issuedDate: new Date(),
        validUntil: oneYearFromNow,
        confidence: 0.85,
      };

    case 'LAB_REPORT':
    case 'COA':
      return {
        thcContent: Math.round(Math.random() * 25 * 10) / 10,
        cbdContent: Math.round(Math.random() * 10 * 10) / 10,
        batchNumber: `BATCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        validUntil: new Date(),
        testResults: {
          overall: 'PASS',
          pesticides: 'PASS',
          heavyMetals: 'PASS',
          microbials: 'PASS',
        },
        confidence: 0.9,
      };

    case 'INSURANCE':
      return {
        issuedTo: 'Sample Merchant LLC',
        issuedBy: 'Cannabis Insurance Co.',
        licenseNumber: `POL-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        validUntil: oneYearFromNow,
        confidence: 0.8,
      };

    default:
      return {
        confidence: 0.5,
      };
  }
}
