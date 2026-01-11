import { Schema, model, Document, Types } from 'mongoose';
import { Role } from '@veridex/roles-permissions';

export interface IUser extends Document {
  _id: Types.ObjectId;
  authUserId: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    authUserId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true,
    },
    email: { 
      type: String, 
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: { 
      type: String, 
      required: true,
      enum: Object.values(Role),
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatarUrl: String,
    isActive: { 
      type: Boolean, 
      default: true,
      index: true,
    },
    lastLoginAt: Date,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Compound indexes for common queries
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ email: 1 }, { unique: true });

// Text search index
UserSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

export const UserModel = model<IUser>('User', UserSchema);
