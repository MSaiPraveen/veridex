import { Schema, model, Document, Types } from 'mongoose';

export type OrgType = 'MERCHANT' | 'VENDOR' | 'DISPENSARY' | 'CULTIVATOR' | 'MANUFACTURER';

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  type: OrgType;
  description?: string;
  logo?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  licenseNumber?: string;
  licenseState?: string;
  isActive: boolean;
  isVerified: boolean;
  ownerId?: Types.ObjectId;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ['MERCHANT', 'VENDOR', 'DISPENSARY', 'CULTIVATOR', 'MANUFACTURER'],
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    logo: String,
    website: String,
    phone: String,
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'USA' },
    },
    licenseNumber: String,
    licenseState: String,
    isActive: { 
      type: Boolean, 
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Indexes
OrganizationSchema.index({ name: 'text', description: 'text' });
OrganizationSchema.index({ type: 1, isActive: 1 });
OrganizationSchema.index({ licenseNumber: 1, licenseState: 1 });

export const OrganizationModel = model<IOrganization>('Organization', OrganizationSchema);
