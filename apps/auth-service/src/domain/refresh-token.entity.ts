import { Schema, model, Document, Types } from 'mongoose';

// TypeScript interface for RefreshToken document
export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
      index: true,
    },
    token: { 
      type: String, 
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Note: index defined below as TTL index, don't add index: true here
    },
    revoked: { 
      type: Boolean, 
      default: false,
      index: true,
    },
    revokedAt: Date,
    userAgent: String,
    ipAddress: String,
  },
  { timestamps: true }
);

// Compound index for efficient queries
RefreshTokenSchema.index({ userId: 1, revoked: 1 });

// TTL index to auto-delete expired tokens after 7 days past expiration
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 604800 });

export const RefreshTokenModel = model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
