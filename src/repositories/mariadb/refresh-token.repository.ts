import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../../config/mariadb.config.js';
import type { CreateRefreshTokenInput, RefreshToken } from '../../types/refresh-token.types.js';
import type { RefreshTokenRepository } from '../refresh-token.repository.js';

type RefreshTokenRow = RefreshToken & RowDataPacket;

export class MariaDBRefreshTokenRepository implements RefreshTokenRepository {
    /** Persiste un refresh token usando su hash. */
    async create(data: CreateRefreshTokenInput): Promise<void> {
        await pool.query<ResultSetHeader>(
            `
            INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                data.id,
                data.user_id,
                data.token_hash,
                data.expires_at,
                data.user_agent,
                data.ip_address,
            ]
        );
    }

    /** Revoca tokens activos del mismo usuario y dispositivo. */
    async revokePreviousDeviceTokens(userId: string, userAgent: string | null): Promise<void> {
        await pool.query(
            `
            UPDATE refresh_tokens
            SET is_revoked = 1
            WHERE user_id = ?
                AND is_revoked = 0
                AND (
                    user_agent = ?
                    OR (user_agent IS NULL AND ? IS NULL)
                )
            `,
            [userId, userAgent, userAgent]
        );
    }

    /** Elimina tokens expirados y excedentes por usuario. */
    async pruneTokens(userId: string, maxTokens: number): Promise<void> {
        await pool.query(
            `
            DELETE FROM refresh_tokens
            WHERE user_id = ?
                AND (
                    expires_at < NOW()
                    OR id NOT IN (
                        SELECT id FROM (
                            SELECT id FROM refresh_tokens
                            WHERE user_id = ?
                            ORDER BY is_revoked ASC, created_at DESC
                            LIMIT ?
                        ) AS tokens_to_keep
                    )
                )
            `,
            [userId, userId, maxTokens]
        );
    }

    /** Busca un refresh token por su JTI. */
    async findById(id: string): Promise<RefreshToken | null> {
        const [refreshTokens] = await pool.query<RefreshTokenRow[]>(
            `
            SELECT * FROM refresh_tokens
            WHERE id = ?
            `,
            [id]
        );

        const refreshToken = refreshTokens[0];
        return refreshToken ?? null;
    }

    /** Revoca todos los tokens activos de un usuario. */
    async revokeAllTokensForUser(userId: string): Promise<void> {
        await pool.query(
            `
            UPDATE refresh_tokens
            SET is_revoked = 1
            WHERE user_id = ? 
                AND is_revoked = 0
            `,
            [userId]
        );
    }

    /** Revoca atomicamente un token activo. */
    async revokeById(id: string): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            `
            UPDATE refresh_tokens
            SET is_revoked = 1
            WHERE id = ?
                AND is_revoked = 0
            `,
            [id]
        );

        return result.affectedRows === 1;
    }
}
