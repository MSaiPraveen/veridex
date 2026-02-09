import { Schema, model, Document, Types } from 'mongoose';

/**
 * Organization Invitation Entity
 * 
 * Represents an invitation for a user to join an organization
 * Invitations can be sent via email to existing or new users
 */

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
export type InvitedRole = 'MEMBER' | 'ADMIN' | 'MANAGER';

export interface IInvitation extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  role: InvitedRole;
  invitedBy: Types.ObjectId;
  token: string;
  status: InvitationStatus;
  message?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: Types.ObjectId;
  declinedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
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
      enum: ['MEMBER', 'ADMIN', 'MANAGER'],
      default: 'MEMBER',
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: Date,
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    declinedAt: Date,
    cancelledAt: Date,
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Compound indexes
InvitationSchema.index({ organizationId: 1, email: 1 });
InvitationSchema.index({ organizationId: 1, status: 1 });
InvitationSchema.index({ email: 1, status: 1 });

export const InvitationModel = model<IInvitation>('Invitation', InvitationSchema);
