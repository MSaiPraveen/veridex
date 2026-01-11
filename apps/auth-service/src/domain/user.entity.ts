import { Schema, model, Document, Types } from 'mongoose';
import { Role } from '@veridex/roles-permissions';

// TypeScript interface for User document
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { 
      type: String, 
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: { 
      type: String, 
      required: true,
    },
    role: { 
      type: String, 
      required: true,
      enum: Object.values(Role),
      default: Role.CONSUMER,
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
    organizationId: {
      type: String,
      trim: true,
      index: true,
    },
    isActive: { 
      type: Boolean, 
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: Date,
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockoutUntil: Date,
  },
  { timestamps: true }
);

// Indexes for common queries
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

export const UserModel = model<IUser>('User', UserSchema);
