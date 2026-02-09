import * as crypto from 'crypto';
import { InvitationModel, IInvitation, InvitedRole, InvitationStatus } from '../domain/invitation.entity';
import { OrganizationRepo } from '../repositories/organization.repo';
import { UserRepo } from '../repositories/user.repo';
import { MembershipRepo } from '../repositories/membership.repo';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../errors/service.errors';

const INVITATION_EXPIRY_DAYS = 7;

export interface CreateInvitationInput {
  organizationId: string;
  email: string;
  role: InvitedRole;
  invitedBy: string;
  message?: string;
}

export interface InvitationWithDetails {
  _id: any;
  organizationId: any;
  email: string;
  role: string;
  invitedBy: any;
  token: string;
  status: string;
  message?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: any;
  declinedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: any;
  createdAt: Date;
  updatedAt: Date;
  organization?: {
    _id: string;
    name: string;
    type: string;
  };
  inviter?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

/**
 * Invitation Service
 * 
 * Handles organization member invitations:
 * - Creating invitations
 * - Accepting/declining invitations
 * - Listing pending invitations
 * - Cancelling invitations
 */
export const InvitationService = {
  /**
   * Create an invitation to join an organization
   */
  async createInvitation(input: CreateInvitationInput): Promise<IInvitation> {
    // Validate organization exists
    const org = await OrganizationRepo.findById(input.organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // Check if inviter is a member of the organization
    const inviterMembership = await MembershipRepo.findByUserAndOrg(input.invitedBy, input.organizationId);
    if (!inviterMembership || !['OWNER', 'ADMIN', 'MANAGER'].includes(inviterMembership.role)) {
      throw new ForbiddenError('You do not have permission to invite members to this organization');
    }

    // Check if user is already a member
    const existingUser = await UserRepo.findByEmail(input.email);
    if (existingUser) {
      const existingMembership = await MembershipRepo.findByUserAndOrg(
        String(existingUser._id), 
        input.organizationId
      );
      if (existingMembership && existingMembership.status !== 'REMOVED') {
        throw new ConflictError('User is already a member of this organization');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await InvitationModel.findOne({
      organizationId: input.organizationId,
      email: input.email.toLowerCase(),
      status: 'PENDING',
    });
    if (existingInvitation) {
      throw new ConflictError('An invitation has already been sent to this email');
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // Create invitation
    const invitation = await InvitationModel.create({
      organizationId: input.organizationId,
      email: input.email.toLowerCase(),
      role: input.role,
      invitedBy: input.invitedBy,
      token,
      status: 'PENDING',
      message: input.message,
      expiresAt,
    });

    // TODO: Send invitation email with token
    console.log(`[Invitation] Created invitation for ${input.email} to join ${org.name}`);

    return invitation;
  },

  /**
   * Get invitation by token
   */
  async getByToken(token: string): Promise<InvitationWithDetails | null> {
    const invitation = await InvitationModel.findOne({ token });
    if (!invitation) return null;

    // Get organization details
    const org = await OrganizationRepo.findById(String(invitation.organizationId));
    
    // Get inviter details
    const inviter = await UserRepo.findById(String(invitation.invitedBy));

    const invObj = invitation.toObject();
    return {
      _id: invObj._id,
      organizationId: invObj.organizationId,
      email: invObj.email,
      role: invObj.role,
      invitedBy: invObj.invitedBy,
      token: invObj.token,
      status: invObj.status,
      message: invObj.message,
      expiresAt: invObj.expiresAt,
      acceptedAt: invObj.acceptedAt,
      acceptedBy: invObj.acceptedBy,
      declinedAt: invObj.declinedAt,
      cancelledAt: invObj.cancelledAt,
      cancelledBy: invObj.cancelledBy,
      createdAt: invObj.createdAt,
      updatedAt: invObj.updatedAt,
      organization: org ? {
        _id: String(org._id),
        name: org.name,
        type: org.type,
      } : undefined,
      inviter: inviter ? {
        _id: String(inviter._id),
        firstName: inviter.firstName,
        lastName: inviter.lastName,
        email: inviter.email,
      } : undefined,
    } as InvitationWithDetails;
  },

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<IInvitation> {
    const invitation = await InvitationModel.findOne({
      token,
      status: 'PENDING',
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found or already processed');
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      throw new ValidationError('Invitation has expired');
    }

    // Verify the accepting user's email matches the invitation
    const user = await UserRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenError('This invitation was sent to a different email address');
    }

    // Create membership
    await MembershipRepo.create({
      userId: userId as any,
      organizationId: invitation.organizationId as any,
      role: invitation.role as any,
      status: 'ACTIVE',
      invitedBy: invitation.invitedBy as any,
      invitedAt: invitation.createdAt,
      acceptedAt: new Date(),
    });

    // Update invitation
    invitation.status = 'ACCEPTED';
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = user._id;
    await invitation.save();

    console.log(`[Invitation] User ${user.email} accepted invitation to organization ${invitation.organizationId}`);

    return invitation;
  },

  /**
   * Decline an invitation
   */
  async declineInvitation(token: string, userId: string): Promise<IInvitation> {
    const invitation = await InvitationModel.findOne({
      token,
      status: 'PENDING',
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found or already processed');
    }

    // Verify the declining user's email matches the invitation
    const user = await UserRepo.findById(userId);
    if (user && user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenError('This invitation was sent to a different email address');
    }

    invitation.status = 'DECLINED';
    invitation.declinedAt = new Date();
    await invitation.save();

    return invitation;
  },

  /**
   * Cancel an invitation (by organization admin)
   */
  async cancelInvitation(invitationId: string, cancelledBy: string): Promise<IInvitation> {
    const invitation = await InvitationModel.findById(invitationId);

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new ValidationError('Only pending invitations can be cancelled');
    }

    // Verify canceller has permission
    const membership = await MembershipRepo.findByUserAndOrg(cancelledBy, String(invitation.organizationId));
    if (!membership || !['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role)) {
      throw new ForbiddenError('You do not have permission to cancel this invitation');
    }

    invitation.status = 'CANCELLED';
    invitation.cancelledAt = new Date();
    invitation.cancelledBy = cancelledBy as any;
    await invitation.save();

    return invitation;
  },

  /**
   * Get pending invitations for an organization
   */
  async getOrganizationInvitations(
    organizationId: string,
    status?: InvitationStatus
  ): Promise<IInvitation[]> {
    const query: any = { organizationId };
    if (status) {
      query.status = status;
    }
    return InvitationModel.find(query).sort({ createdAt: -1 });
  },

  /**
   * Get pending invitations for a user (by email)
   */
  async getUserInvitations(email: string): Promise<InvitationWithDetails[]> {
    const invitations = await InvitationModel.find({
      email: email.toLowerCase(),
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    // Enrich with organization details
    const enrichedInvitations: InvitationWithDetails[] = [];
    for (const invitation of invitations) {
      const org = await OrganizationRepo.findById(String(invitation.organizationId));
      const inviter = await UserRepo.findById(String(invitation.invitedBy));
      
      const invObj = invitation.toObject();
      enrichedInvitations.push({
        _id: invObj._id,
        organizationId: invObj.organizationId,
        email: invObj.email,
        role: invObj.role,
        invitedBy: invObj.invitedBy,
        token: invObj.token,
        status: invObj.status,
        message: invObj.message,
        expiresAt: invObj.expiresAt,
        acceptedAt: invObj.acceptedAt,
        acceptedBy: invObj.acceptedBy,
        declinedAt: invObj.declinedAt,
        cancelledAt: invObj.cancelledAt,
        cancelledBy: invObj.cancelledBy,
        createdAt: invObj.createdAt,
        updatedAt: invObj.updatedAt,
        organization: org ? {
          _id: String(org._id),
          name: org.name,
          type: org.type,
        } : undefined,
        inviter: inviter ? {
          _id: String(inviter._id),
          firstName: inviter.firstName,
          lastName: inviter.lastName,
          email: inviter.email,
        } : undefined,
      } as InvitationWithDetails);
    }

    return enrichedInvitations;
  },

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId: string, resendBy: string): Promise<IInvitation> {
    const invitation = await InvitationModel.findById(invitationId);

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new ValidationError('Only pending invitations can be resent');
    }

    // Verify resender has permission
    const membership = await MembershipRepo.findByUserAndOrg(resendBy, String(invitation.organizationId));
    if (!membership || !['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role)) {
      throw new ForbiddenError('You do not have permission to resend this invitation');
    }

    // Generate new token and extend expiry
    invitation.token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
    invitation.expiresAt = expiresAt;
    await invitation.save();

    // TODO: Send invitation email with new token
    console.log(`[Invitation] Resent invitation to ${invitation.email}`);

    return invitation;
  },
};
