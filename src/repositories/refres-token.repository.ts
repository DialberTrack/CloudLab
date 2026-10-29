import { env } from '../config/env.js';
import type { CreateRefreshTokenInput, RefreshToken } from '../types/refresh-token.types.js';
import { MariaDBRefreshTokenRepository } from './mariadb/refresh-token.repository.js';

export interface RefreshTokenRepository {
    create(data: CreateRefreshTokenInput): Promise<void>;
    revokePreviousDeviceTokens(userId: string, userAgent: string | null): Promise<void>;
    pruneTokens(userId: string, maxTokens: number): Promise<void>;
    findById(id: string): Promise<RefreshToken | null>;
    revokeAllTokensForUser(userId: string): Promise<void>;
    revokeById(id: string): Promise<boolean>;
}

export const refreshCookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth',
    maxAge: env.JWT_REFRESH_COOKIE_MAX_AGE_MS,
};

export const RefreshTokenRepository = new MariaDBRefreshTokenRepository();
