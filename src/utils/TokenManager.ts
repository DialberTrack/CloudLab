import { env } from "../config/env.js";
import type { User } from "../schemas/UserSchema.js";
import jwt, { type JwtPayload } from "jsonwebtoken";

interface UserPayLoad extends JwtPayload {
    id: string;
    role: string;
}

export class TokenManager {
    public static generateAccessToken(user: User): string {
        return jwt.sign(
            { id: user.id, role: user.role },
            env.JWT_SECRET,
            { expiresIn: env.JWT_EXPIRES_IN as any }
        );
    }

    public static generateRefreshToken(user: User): string {
        return jwt.sign(
            { id: user.id },
            env.JWT_REFRESH_SECRET,
            { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
        );
    }

    public static verifyAccessToken(token: string): UserPayLoad | null {
        try {
            return jwt.verify(token, env.JWT_SECRET) as UserPayLoad;
        } catch (error) {
            return null;
        }
    }

    public static verifyRefreshToken(token: string): { id: string } | null {
        try {
            return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
        } catch (error) {
            return null;
        }
    }
}