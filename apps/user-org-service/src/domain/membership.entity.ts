import { Schema, model, Document, Types } from 'mongoose';

export type MemberRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER';
export type MemberStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

export interface IMembership extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  role: MemberRole;
  status: MemberStatus;
  invitedBy?: Types.ObjectId;
  invitedAt?: Date;
  acceptedAt?: Date;
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization',
      required: true,
      index: true,
    },
    role: { 
      type: String, 
      enum: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'REMOVED'],
      default: 'ACTIVE',
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    invitedAt: Date,
    acceptedAt: Date,
    permissions: [String],
  },
  { timestamps: true }
);

// Ensure unique membership per user-org combination
MembershipSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true }
);

// Index for finding org members
MembershipSchema.index({ organizationId: 1, status: 1, role: 1 });

export const MembershipModel = model<IMembership>('Membership', MembershipSchema);
