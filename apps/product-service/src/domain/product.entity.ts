import { Schema, model, Document, Types, FlattenMaps } from 'mongoose';

export type ComplianceStatus = 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ProductCategory = 'FLOWER' | 'EDIBLE' | 'CONCENTRATE' | 'TOPICAL' | 'TINCTURE' | 'PRE_ROLL' | 'ACCESSORY' | 'OTHER' | 'CANNABIS' | 'HEMP_CBD' | 'SUPPLEMENT' | 'PHARMA' | 'PEPTIDE';
export type ProductScope = 'GLOBAL' | 'ORGANIZATION';

// Base product interface (without Mongoose Document methods)
export interface IProductBase {
  _id: Types.ObjectId;
  
  // CRITICAL: Scope & Ownership
  scope: ProductScope;
  merchantId?: Types.ObjectId;       // User who created (optional for global)
  organizationId?: Types.ObjectId;   // Required for ORGANIZATION scope
  sourceProductId?: Types.ObjectId;  // Original global product if imported
  
  // Basic Info
  name: string;
  sku: string;
  description?: string;
  category: ProductCategory;
  subcategory?: string;
  brand?: string;
  
  // Cannabis-specific
  thcContent?: number;
  cbdContent?: number;
  strain?: string;
  strainType?: 'INDICA' | 'SATIVA' | 'HYBRID';
  
  // Pricing
  price: number;
  costPrice?: number;
  currency: string;
  
  // Inventory
  quantity: number;
  unit: string;
  weight?: number;
  weightUnit?: string;
  
  // Compliance
  complianceStatus: ComplianceStatus;
  lastComplianceCheck?: Date;
  complianceNotes?: string;
  licenseRequired?: boolean;
  
  // Status
  status: ProductStatus;
  isActive: boolean;
  
  // Media
  images: string[];
  thumbnailUrl?: string;
  
  // Tracking
  batchNumber?: string;
  lotNumber?: string;
  expirationDate?: Date;
  harvestDate?: Date;
  
  // Lab Testing
  labTested: boolean;
  labTestUrl?: string;
  labTestDate?: Date;
  
  // Metadata
  tags: string[];
  metadata: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Full Mongoose Document type (for save, model methods, etc.)
export interface IProduct extends Document, IProductBase {}

// Lean document type (for .lean() queries) 
export type LeanProduct = FlattenMaps<IProductBase> & { _id: Types.ObjectId };

const ProductSchema = new Schema<IProduct>(
  {
    // CRITICAL: Scope & Ownership
    scope: { 
      type: String, 
      enum: ['GLOBAL', 'ORGANIZATION'], 
      default: 'ORGANIZATION',
      required: true,
      index: true,
    },
    merchantId: { type: Schema.Types.ObjectId, index: true },
    organizationId: { type: Schema.Types.ObjectId, index: true },
    sourceProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    
    // Basic Info
    name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, maxlength: 2000 },
    category: { 
      type: String, 
      required: true,
      enum: ['FLOWER', 'EDIBLE', 'CONCENTRATE', 'TOPICAL', 'TINCTURE', 'PRE_ROLL', 'ACCESSORY', 'OTHER', 'CANNABIS', 'HEMP_CBD', 'SUPPLEMENT', 'PHARMA', 'PEPTIDE'],
    },
    subcategory: { type: String, trim: true },
    brand: { type: String, trim: true },
    
    // Cannabis-specific
    thcContent: { type: Number, min: 0, max: 100 },
    cbdContent: { type: Number, min: 0, max: 100 },
    strain: { type: String, trim: true },
    strainType: { type: String, enum: ['INDICA', 'SATIVA', 'HYBRID'] },
    
    // Pricing
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'USD', maxlength: 3 },
    
    // Inventory
    quantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'unit' },
    weight: { type: Number, min: 0 },
    weightUnit: { type: String, enum: ['g', 'oz', 'lb', 'kg'] },
    
    // Compliance
    complianceStatus: {
      type: String,
      enum: ['PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW'],
      default: 'PENDING',
      index: true,
    },
    lastComplianceCheck: { type: Date },
    complianceNotes: { type: String },
    licenseRequired: { type: Boolean, default: true },
    
    // Status
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    isActive: { type: Boolean, default: true },
    
    // Media
    images: [{ type: String }],
    thumbnailUrl: { type: String },
    
    // Tracking
    batchNumber: { type: String, trim: true },
    lotNumber: { type: String, trim: true },
    expirationDate: { type: Date },
    harvestDate: { type: Date },
    
    // Lab Testing
    labTested: { type: Boolean, default: false },
    labTestUrl: { type: String },
    labTestDate: { type: Date },
    
    // Metadata
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

// Compound indexes
ProductSchema.index({ merchantId: 1, sku: 1 }, { unique: true, sparse: true });
ProductSchema.index({ scope: 1, status: 1 });
ProductSchema.index({ scope: 1, organizationId: 1, status: 1 });
ProductSchema.index({ organizationId: 1, complianceStatus: 1 });
ProductSchema.index({ category: 1, complianceStatus: 1 });
ProductSchema.index({ name: 'text', description: 'text', brand: 'text' });
ProductSchema.index({ tags: 1 });

// Validation: organizationId required for ORGANIZATION scope
ProductSchema.pre('save', function(next) {
  if (this.scope === 'ORGANIZATION' && !this.organizationId) {
    next(new Error('organizationId is required for ORGANIZATION scope products'));
  } else {
    next();
  }
});

export const ProductModel = model<IProduct>('Product', ProductSchema);
