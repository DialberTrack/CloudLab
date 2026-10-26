import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { User } from '../schemas/user.schema.js';
import crypto from 'crypto';

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
    public static generateAccessToken(user: User): string {
        const options: jwt.SignOptions = {
            expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
        };

        return jwt.sign(accessTokenPayload(user), env.JWT_SECRET, options);
    }

    public static generateRefreshToken(user: User): { refreshToken: string; jti: string } {
        const jti = crypto.randomUUID();

        const options: jwt.SignOptions = {
            expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
        };

        const refreshToken = jwt.sign(
            refreshTokenPayload(user, jti),
            env.JWT_REFRESH_SECRET,
            options
        );
        return { refreshToken, jti };
    }

    public static verifyAccessToken(token: string): AccessTokenPayload | null {
        try {
            const payload = jwt.verify(token, env.JWT_SECRET) as Partial<AccessTokenPayload>;
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

    public static verifyRefreshToken(token: string): RefreshTokenPayload | null {
        try {
            const payload = jwt.verify(
                token,
                env.JWT_REFRESH_SECRET
            ) as Partial<RefreshTokenPayload>;
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

    public static hashToken(token: string): string {
        const hash = crypto.createHash('sha256').update(token).digest('hex');
        return hash;
    }
}

const isAccessTokenPayload = (
    payload: Partial<AccessTokenPayload>
): payload is AccessTokenPayload =>
    typeof payload.user_id === 'string' &&
    payload.user_id.length > 0 &&
    (payload.role === 'admin' || payload.role === 'user') &&
    typeof payload.iat === 'number' &&
    typeof payload.exp === 'number';

const isRefreshTokenPayload = (
    payload: Partial<RefreshTokenPayload>
): payload is RefreshTokenPayload =>
    typeof payload.user_id === 'string' &&
    payload.user_id.length > 0 &&
    typeof payload.jti === 'string' &&
    payload.jti.length > 0 &&
    typeof payload.iat === 'number' &&
    typeof payload.exp === 'number';
