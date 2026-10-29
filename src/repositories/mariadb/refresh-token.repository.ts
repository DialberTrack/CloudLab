import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../../config/mariadb.config.js';
import type { CreateRefreshTokenInput, RefreshToken } from '../../types/refresh-token.types.js';
import type { RefreshTokenRepository } from '../refres-token.repository.js';

type RefreshTokenRow = RefreshToken & RowDataPacket;

export class MariaDBRefreshTokenRepository implements RefreshTokenRepository {
    /**
     * Persiste un refresh token usando un hash, nunca el token plano.
     *
     * @param data Datos del token, usuario, dispositivo y expiracion.
     * @returns {Promise<void>} Se completa tras insertar el token.
     * @throws {Error} Si MariaDB rechaza la insercion.
     */
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

    /**
     * Revoca tokens activos del mismo usuario y dispositivo.
     *
     * @param userId UUID del usuario.
     * @param userAgent Identificador del dispositivo o `null`.
     * @returns {Promise<void>} Se completa tras actualizar los tokens.
     * @throws {Error} Si MariaDB rechaza la actualizacion.
     */
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

    /**
     * Elimina tokens expirados y excedentes del limite por usuario.
     *
     * @param userId UUID del usuario.
     * @param maxTokens Maximo de tokens que deben conservarse.
     * @returns {Promise<void>} Se completa tras limpiar la tabla.
     * @throws {Error} Si MariaDB rechaza la eliminacion.
     */
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

    /**
     * Busca un refresh token por su JTI.
     *
     * @param id JTI del token.
     * @returns {Promise<RefreshToken | null>} Token encontrado o `null`.
     * @throws {Error} Si MariaDB rechaza la consulta.
     */
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

    /**
     * Revoca todos los tokens activos de un usuario.
     *
     * @param userId UUID del usuario.
     * @returns {Promise<void>} Se completa tras revocar las sesiones.
     * @throws {Error} Si MariaDB rechaza la actualizacion.
     */
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

    /**
     * Revoca atomicamente un token activo.
     *
     * @param id JTI del token.
     * @returns {Promise<boolean>} `true` si una fila cambio de activa a revocada.
     * @throws {Error} Si MariaDB rechaza la actualizacion.
     */
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
