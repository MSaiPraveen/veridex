import { RefreshTokenModel, IRefreshToken } from '../domain/refresh-token.entity';
import { Types } from 'mongoose';

export interface CreateRefreshTokenData {
  userId: string | Types.ObjectId;
  token: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export const RefreshTokenRepo = {
  create: (data: CreateRefreshTokenData): Promise<IRefreshToken> =>
    RefreshTokenModel.create({
      ...data,
      userId: new Types.ObjectId(data.userId),
      revoked: false,
    }),

  findByToken: (token: string): Promise<IRefreshToken | null> =>
    RefreshTokenModel.findOne({ token, revoked: false }).exec(),

  findValidToken: async (token: string): Promise<IRefreshToken | null> => {
    const refreshToken = await RefreshTokenModel.findOne({ 
      token, 
      revoked: false,
      expiresAt: { $gt: new Date() },
    }).exec();
    return refreshToken;
  },

  revokeToken: (token: string): Promise<IRefreshToken | null> =>
    RefreshTokenModel.findOneAndUpdate(
      { token },
      { revoked: true, revokedAt: new Date() },
      { new: true }
    ).exec(),

  revokeAllUserTokens: async (userId: string): Promise<number> => {
    const result = await RefreshTokenModel.updateMany(
      { userId: new Types.ObjectId(userId), revoked: false },
      { revoked: true, revokedAt: new Date() }
    ).exec();
    return result.modifiedCount;
  },

  findUserTokens: (userId: string): Promise<IRefreshToken[]> =>
    RefreshTokenModel.find({ 
      userId: new Types.ObjectId(userId), 
      revoked: false,
      expiresAt: { $gt: new Date() },
    }).exec(),

  deleteExpired: async (): Promise<number> => {
    const result = await RefreshTokenModel.deleteMany({
      expiresAt: { $lt: new Date() },
    }).exec();
    return result.deletedCount;
  },
};
