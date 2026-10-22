import { env } from '../config/env.js';
import type { User } from '../schemas/UserSchema.js';
import jwt, { type JwtPayload } from 'jsonwebtoken';

export interface AccessTokenPayload extends JwtPayload {
    id: string;
    role: User['role'];
}

export class TokenManager {
    public static generateAccessToken(user: User): string {
        return jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN,
        });
    }

    public static generateRefreshToken(user: User): string {
        return jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, {
            expiresIn: env.JWT_REFRESH_EXPIRES_IN,
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
}
