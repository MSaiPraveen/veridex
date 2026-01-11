import { UserModel, IUser } from '../domain/user.entity';
import { Types } from 'mongoose';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  lastLoginAt?: Date;
  failedLoginAttempts?: number;
  lockoutUntil?: Date | null;
  organizationId?: string;
}

export const UserRepo = {
  findById: (id: string): Promise<IUser | null> =>
    UserModel.findById(id).exec(),

  findByEmail: (email: string): Promise<IUser | null> =>
    UserModel.findOne({ email: email.toLowerCase() }).exec(),

  create: (data: CreateUserData): Promise<IUser> =>
    UserModel.create({
      ...data,
      email: data.email.toLowerCase(),
    }),

  update: (id: string, data: UpdateUserData): Promise<IUser | null> =>
    UserModel.findByIdAndUpdate(id, data, { new: true }).exec(),

  updateLoginSuccess: (id: string): Promise<IUser | null> =>
    UserModel.findByIdAndUpdate(
      id,
      { 
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
      { new: true }
    ).exec(),

  incrementFailedAttempts: async (id: string): Promise<IUser | null> => {
    const user = await UserModel.findById(id).exec();
    if (!user) return null;
    
    const attempts = user.failedLoginAttempts + 1;
    const lockoutUntil = attempts >= 5 
      ? new Date(Date.now() + 15 * 60 * 1000) // 15 minutes lockout
      : undefined;
    
    return UserModel.findByIdAndUpdate(
      id,
      { 
        failedLoginAttempts: attempts,
        ...(lockoutUntil && { lockoutUntil }),
      },
      { new: true }
    ).exec();
  },

  existsByEmail: async (email: string): Promise<boolean> => {
    const count = await UserModel.countDocuments({ email: email.toLowerCase() }).exec();
    return count > 0;
  },

  setActive: (id: string, isActive: boolean): Promise<IUser | null> =>
    UserModel.findByIdAndUpdate(id, { isActive }, { new: true }).exec(),
};
