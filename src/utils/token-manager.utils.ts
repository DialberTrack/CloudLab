import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import type { User } from '../schemas/user.schema.js';

export type AccessTokenPayload = {
    user_id: string;
    role: User['role'];
    iat: number;
    exp: number;
};

export type RefreshTokenPayload = {
    user_id: string;
    jti: string;
    iat: number;
    exp: number;
};

const accessTokenPayload = (user: User): Omit<AccessTokenPayload, 'iat' | 'exp'> => ({
    user_id: user.id,
    role: user.role,
});

const refreshTokenPayload = (
    user: User,
    jti: string
): Omit<RefreshTokenPayload, 'iat' | 'exp'> => ({
    jti,
    user_id: user.id,
});

export class TokenManager {
    /** Genera un JWT de acceso. */
    public static generateAccessToken(user: User): string {
        const options: jwt.SignOptions = {
            expiresIn: getJwtStringValue(env.JWT_EXPIRES_IN),
        };

        return jwt.sign(accessTokenPayload(user), env.JWT_SECRET, options);
    }

    /** Genera un JWT de refresh y su JTI. */
    public static generateRefreshToken(user: User): { refreshToken: string; jti: string } {
        const jti = crypto.randomUUID();

        const options: jwt.SignOptions = {
            expiresIn: getJwtStringValue(env.JWT_REFRESH_EXPIRES_IN),
        };

        const refreshToken = jwt.sign(
            refreshTokenPayload(user, jti),
            env.JWT_REFRESH_SECRET,
            options
        );
        return { refreshToken, jti };
    }

    /** Verifica la firma y estructura de un access token. */
    public static verifyAccessToken(token: string): AccessTokenPayload | null {
        try {
            const payload = jwt.verify(token, env.JWT_SECRET);
            if (!isAccessTokenPayload(payload)) {
                return null;
            }

            return {
                user_id: payload.user_id,
                role: payload.role,
                iat: payload.iat,
                exp: payload.exp,
            };
        } catch {
            return null;
        }
    }

    /** Verifica la firma y estructura de un refresh token. */
    public static verifyRefreshToken(token: string): RefreshTokenPayload | null {
        try {
            const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
            if (!isRefreshTokenPayload(payload)) {
                return null;
            }

            return {
                user_id: payload.user_id,
                jti: payload.jti,
                iat: payload.iat,
                exp: payload.exp,
            };
        } catch {
            return null;
        }
    }

    /** Calcula el hash SHA-256 de un refresh token. */
    public static hashToken(token: string): string {
        const hash = crypto.createHash('sha256').update(token).digest('hex');
        return hash;
    }
}

type JwtStringValue = Exclude<NonNullable<jwt.SignOptions['expiresIn']>, number>;

const isJwtStringValue = (value: string): value is JwtStringValue =>
    /^\d+(?:\.\d+)?\s?(?:milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)$/.test(
        value
    );

const getJwtStringValue = (value: string): JwtStringValue => {
    if (!isJwtStringValue(value)) {
        throw new Error('Invalid JWT expiration value');
    }

    return value;
};

const isAccessTokenPayload = (payload: unknown): payload is AccessTokenPayload =>
    typeof payload === 'object' &&
    payload !== null &&
    'user_id' in payload &&
    typeof payload.user_id === 'string' &&
    payload.user_id.length > 0 &&
    'role' in payload &&
    (payload.role === 'admin' || payload.role === 'user') &&
    'iat' in payload &&
    typeof payload.iat === 'number' &&
    'exp' in payload &&
    typeof payload.exp === 'number';

const isRefreshTokenPayload = (payload: unknown): payload is RefreshTokenPayload =>
    typeof payload === 'object' &&
    payload !== null &&
    'user_id' in payload &&
    typeof payload.user_id === 'string' &&
    payload.user_id.length > 0 &&
    'jti' in payload &&
    typeof payload.jti === 'string' &&
    payload.jti.length > 0 &&
    'iat' in payload &&
    typeof payload.iat === 'number' &&
    'exp' in payload &&
    typeof payload.exp === 'number';
