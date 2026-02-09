import { Schema, model, Document, Types } from 'mongoose';

/**
 * Email Verification Token Entity
 * 
 * Stores email verification tokens for new user registrations
 * Tokens expire after 24 hours
 */
export interface IEmailVerification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  email: string;
  token: string;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
}

const EmailVerificationSchema = new Schema<IEmailVerification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
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
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Auto-expire documents
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailVerificationModel = model<IEmailVerification>('EmailVerification', EmailVerificationSchema);
