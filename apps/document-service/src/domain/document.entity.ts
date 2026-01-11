import { Schema, model, Document as MongoDocument, Types } from 'mongoose';

export type DocumentType = 
  | 'LAB_REPORT' 
  | 'BUSINESS_LICENSE'
  | 'LICENSE'  // Alias for frontend compatibility
  | 'INSURANCE'
  | 'COA' // Certificate of Analysis
  | 'INVOICE'
  | 'CONTRACT'
  | 'COMPLIANCE_CERT'
  | 'CERTIFICATE' // Alias for frontend compatibility
  | 'PRODUCT_PHOTO'
  | 'OTHER';

export type ExtractionStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
export type DocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type VisibilityLevel = 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';

export interface IExtractedData {
  validUntil?: Date;
  issuedTo?: string;
  issuedBy?: string;
  issuedDate?: Date;
  licenseNumber?: string;
  thcContent?: number;
  cbdContent?: number;
  batchNumber?: string;
  testResults?: Record<string, any>;
  rawText?: string;
  confidence?: number;
  // OCR-specific fields
  ocrProvider?: 'tesseract' | 'google-vision' | 'aws-textract';
  ocrConfidence?: number;
}

export interface IDocument extends MongoDocument {
  _id: Types.ObjectId;
  
  // Ownership
  ownerId: Types.ObjectId; // User ID
  organizationId: Types.ObjectId;
  productId?: Types.ObjectId;
  
  // Document Info
  name: string;
  type: DocumentType;
  description?: string;
  
  // File Info
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash?: string; // For deduplication
  
  // Extraction
  extracted: IExtractedData;
  extractionStatus: ExtractionStatus;
  extractedAt?: Date;
  failureReason?: string;
  
  // Status & Visibility
  status: DocumentStatus;
  visibility: VisibilityLevel;
  isActive: boolean;
  
  // Versioning
  version: number;
  parentDocumentId?: Types.ObjectId;
  
  // Expiration
  expiresAt?: Date;
  isExpired?: boolean;
  
  // Tags & Metadata
  tags: string[];
  metadata: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

const ExtractedDataSchema = new Schema({
  validUntil: { type: Date },
  issuedTo: { type: String },
  issuedBy: { type: String },
  issuedDate: { type: Date },
  licenseNumber: { type: String },
  thcContent: { type: Number },
  cbdContent: { type: Number },
  batchNumber: { type: String },
  testResults: { type: Schema.Types.Mixed },
  rawText: { type: String },
  confidence: { type: Number, min: 0, max: 1 },
  ocrProvider: { type: String, enum: ['tesseract', 'google-vision', 'aws-textract'] },
  ocrConfidence: { type: Number, min: 0, max: 1 },
}, { _id: false });

const DocumentSchema = new Schema<IDocument>(
  {
    // Ownership
    ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, required: true, index: true },
    productId: { type: Schema.Types.ObjectId, index: true },
    
    // Document Info
    name: { type: String, required: true, trim: true, maxlength: 255 },
    type: {
      type: String,
      enum: ['LAB_REPORT', 'BUSINESS_LICENSE', 'LICENSE', 'INSURANCE', 'COA', 'INVOICE', 'CONTRACT', 'COMPLIANCE_CERT', 'CERTIFICATE', 'PRODUCT_PHOTO', 'OTHER'],
      required: true,
      index: true,
    },
    description: { type: String, maxlength: 1000 },
    
    // File Info
    filePath: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    fileHash: { type: String },
    
    // Extraction
    extracted: { type: ExtractedDataSchema, default: {} },
    extractionStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    extractedAt: { type: Date },
    failureReason: { type: String },
    
    // Status & Visibility
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED', 'DELETED'],
      default: 'ACTIVE',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['PRIVATE', 'ORGANIZATION', 'PUBLIC'],
      default: 'ORGANIZATION',
    },
    isActive: { type: Boolean, default: true },
    
    // Versioning
    version: { type: Number, default: 1 },
    parentDocumentId: { type: Schema.Types.ObjectId },
    
    // Expiration
    expiresAt: { type: Date },
    
    // Tags & Metadata
    tags: [{ type: String, trim: true }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for expired check
DocumentSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Compound indexes
DocumentSchema.index({ organizationId: 1, type: 1 });
DocumentSchema.index({ ownerId: 1, status: 1 });
DocumentSchema.index({ productId: 1, type: 1 });
DocumentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'DELETED' } });
DocumentSchema.index({ name: 'text', description: 'text' });
DocumentSchema.index({ tags: 1 });
DocumentSchema.index({ fileHash: 1 });

export const DocumentModel = model<IDocument>('Document', DocumentSchema);
