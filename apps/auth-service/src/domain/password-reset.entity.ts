import { Schema, model, Document, Types } from 'mongoose';

/**
 * Password Reset Token Entity
 * 
 * Stores password reset tokens with expiration
 * Tokens are one-time use and expire after 1 hour
 */
export interface IPasswordReset extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>(
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
      index: true,
    },
    usedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Auto-expire documents after they've been used or expired
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetModel = model<IPasswordReset>('PasswordReset', PasswordResetSchema);
