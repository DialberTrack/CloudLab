import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import type { User } from '../src/schemas/user.schema.js';
import { TokenManager } from '../src/utils/token-manager.utils.js';

const user: User = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Test User',
    email: 'test@example.com',
    password: 'not-used-in-this-test',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    is_active: true,
};

describe('TokenManager', () => {
    it('generates and verifies an access token with user_id, role, iat and exp', () => {
        const token = TokenManager.generateAccessToken(user);
        const payload = TokenManager.verifyAccessToken(token);

        expect(payload).toEqual(
            expect.objectContaining({
                user_id: user.id,
                role: user.role,
            }),
        );
        expect(payload?.iat).toEqual(expect.any(Number));
        expect(payload?.exp).toEqual(expect.any(Number));
        expect(payload).not.toHaveProperty('email');
    });

    it('generates a refresh token with user_id and jti, but without role', () => {
        const { refreshToken, jti } = TokenManager.generateRefreshToken(user);
        const payload = TokenManager.verifyRefreshToken(refreshToken);

        expect(payload).toEqual(
            expect.objectContaining({
                user_id: user.id,
                jti,
            }),
        );
        expect(payload).not.toHaveProperty('role');
        expect(payload?.iat).toEqual(expect.any(Number));
        expect(payload?.exp).toEqual(expect.any(Number));
    });

    it('rejects a token signed with the wrong secret or wrong token type', () => {
        const accessToken = TokenManager.generateAccessToken(user);
        const refreshPayload = jwt.decode(accessToken);

        expect(TokenManager.verifyRefreshToken(accessToken)).toBeNull();
        expect(
            TokenManager.verifyAccessToken(
                jwt.sign(refreshPayload as object, env.JWT_REFRESH_SECRET),
            ),
        ).toBeNull();
    });

    it('hashes the same refresh token deterministically', () => {
        const { refreshToken } = TokenManager.generateRefreshToken(user);

        expect(TokenManager.hashToken(refreshToken)).toBe(TokenManager.hashToken(refreshToken));
        expect(TokenManager.hashToken(refreshToken)).not.toBe(
            TokenManager.hashToken(`${refreshToken}.tampered`),
        );
    });
});
