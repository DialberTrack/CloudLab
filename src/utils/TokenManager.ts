import crypto from 'node:crypto';
import { env } from '../config/env.js';
import type { User } from '../schemas/UserSchema.js';
import jwt, { type JwtPayload } from 'jsonwebtoken';

export interface AccessTokenPayload extends JwtPayload {
    id: string;
    role: User['role'];
}

export const WORKSPACE_SESSION_COOKIE = 'ws_session';
export const workspaceSessionCookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/workspace/',
    maxAge: 3_600_000,
};

const WORKSPACE_SESSION_AUDIENCE = 'workspace';
const REFRESH_GRACE_PERIOD_MS = 10_000;

export class TokenManager {
    private static rotatedRefreshTokens = new Map<string, { hash: string; expiresAt: number }>();

    public static generateAccessToken(user: User): string {
        return jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN,
        });
    }

    public static generateRefreshToken(user: User): string {
        return jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, {
            expiresIn: env.JWT_REFRESH_EXPIRES_IN,
            jwtid: crypto.randomUUID(),
        });
    }

    public static generateWorkspaceSession(user: User, refreshToken: string): string {
        return jwt.sign({ rt: TokenManager.hashRefreshToken(refreshToken) }, env.JWT_SECRET, {
            subject: user.id,
            audience: WORKSPACE_SESSION_AUDIENCE,
            expiresIn: workspaceSessionCookieOptions.maxAge / 1000,
        });
    }

    public static verifyAccessToken(token: string): AccessTokenPayload | null {
        try {
            const payload = jwt.verify(token, env.JWT_SECRET);
            if (
                typeof payload !== 'object' ||
                typeof payload.id !== 'string' ||
                (payload.role !== 'admin' && payload.role !== 'user')
            ) {
                return null;
            }

            return {
                id: payload.id,
                role: payload.role,
                ...(typeof payload.iat === 'number' ? { iat: payload.iat } : {}),
                ...(typeof payload.exp === 'number' ? { exp: payload.exp } : {}),
            };
        } catch {
            return null;
        }
    }

    public static verifyRefreshToken(token: string): { id: string } | null {
        try {
            const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
            if (typeof payload !== 'object' || typeof payload.id !== 'string') {
                return null;
            }

            return { id: payload.id };
        } catch {
            return null;
        }
    }

    public static verifyWorkspaceSession(token: string): { id: string; binding: string } | null {
        try {
            const payload = jwt.verify(token, env.JWT_SECRET, {
                audience: WORKSPACE_SESSION_AUDIENCE,
            });
            if (
                typeof payload !== 'object' ||
                typeof payload.sub !== 'string' ||
                typeof payload.rt !== 'string'
            ) {
                return null;
            }

            return { id: payload.sub, binding: payload.rt };
        } catch {
            return null;
        }
    }

    public static rememberRotatedRefreshToken(userId: string, refreshToken: string): void {
        TokenManager.rotatedRefreshTokens.set(userId, {
            hash: TokenManager.hashRefreshToken(refreshToken),
            expiresAt: Date.now() + REFRESH_GRACE_PERIOD_MS,
        });
    }

    public static forgetRotatedRefreshToken(userId: string): void {
        TokenManager.rotatedRefreshTokens.delete(userId);
    }

    public static isRecentlyRotatedRefreshToken(userId: string, refreshToken: string): boolean {
        return TokenManager.isRecentlyRotatedHash(
            userId,
            TokenManager.hashRefreshToken(refreshToken)
        );
    }

    public static isWorkspaceSessionBound(user: User, binding: string): boolean {
        if (!user.refreshToken) {
            return false;
        }

        return (
            binding === TokenManager.hashRefreshToken(user.refreshToken) ||
            TokenManager.isRecentlyRotatedHash(user.id, binding)
        );
    }

    private static hashRefreshToken(refreshToken: string): string {
        return crypto.createHash('sha256').update(refreshToken).digest('base64url');
    }

    private static isRecentlyRotatedHash(userId: string, hash: string): boolean {
        const rotated = TokenManager.rotatedRefreshTokens.get(userId);
        if (!rotated) {
            return false;
        }
        if (rotated.expiresAt <= Date.now()) {
            TokenManager.rotatedRefreshTokens.delete(userId);
            return false;
        }

        return rotated.hash === hash;
    }
}
