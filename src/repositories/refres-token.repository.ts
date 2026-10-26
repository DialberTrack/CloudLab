import type { CreateRefreshTokenDTO, RefreshToken } from '../types/refresh-token.types.js';
import { MariaDBRefreshTokenRepository } from './mariadb/refresh-token.repository.js';

export interface RefreshTokenRepository {
    create(data: CreateRefreshTokenDTO): Promise<void>;
    revokePreviousDeviceTokens(userId: string, userAgent: string | null): Promise<void>;
    pruneTokens(userId: string, maxTokens: number): Promise<void>;
    findById(id: string): Promise<RefreshToken | null>;
    revokeAllTokensForUser(userId: string): Promise<void>;
    revokeById(id: string): Promise<boolean>;
}

export const RefreshTokenRepository = new MariaDBRefreshTokenRepository();
