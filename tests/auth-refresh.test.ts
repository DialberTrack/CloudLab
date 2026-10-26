import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../src/schemas/user.schema.js';
import { TokenManager } from '../src/utils/token-manager.utils.js';

const mocks = vi.hoisted(() => ({
    findById: vi.fn(),
    findRefreshTokenById: vi.fn(),
    revokeById: vi.fn(),
    revokeAllTokensForUser: vi.fn(),
    create: vi.fn(),
    pruneTokens: vi.fn(),
}));

vi.mock('../src/repositories/user.repository.js', () => ({
    UserRepository: {
        findById: mocks.findById,
    },
}));

vi.mock('../src/repositories/refres-token.repository.js', () => ({
    RefreshTokenRepository: {
        findById: mocks.findRefreshTokenById,
        revokeById: mocks.revokeById,
        revokeAllTokensForUser: mocks.revokeAllTokensForUser,
        create: mocks.create,
        pruneTokens: mocks.pruneTokens,
    },
}));

const { AuthController } = await import('../src/controllers/auth.controller.js');

const user: User = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Refresh User',
    email: 'refresh@example.com',
    password: 'not-used-in-this-test',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    is_active: true,
};

const response = () => ({
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    json: vi.fn(),
});

const request = (refreshToken: string): Request =>
    ({
        cookies: { refreshToken },
        headers: { 'user-agent': 'vitest' },
        ip: '127.0.0.1',
    }) as unknown as Request;

describe('AuthController.refresh', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.findById.mockResolvedValue(user);
        mocks.create.mockResolvedValue(undefined);
        mocks.pruneTokens.mockResolvedValue(undefined);
        mocks.revokeById.mockResolvedValue(true);
    });

    it('rotates a valid refresh token and persists the replacement hash', async () => {
        const { refreshToken, jti } = TokenManager.generateRefreshToken(user);
        mocks.findRefreshTokenById.mockResolvedValue({
            id: jti,
            user_id: user.id,
            token_hash: TokenManager.hashToken(refreshToken),
            expires_at: new Date(Date.now() + 60_000),
            is_revoked: false,
        });

        const res = response();
        await AuthController.refresh(request(refreshToken), res as unknown as Response, vi.fn());

        expect(mocks.revokeById).toHaveBeenCalledWith(jti);
        expect(mocks.create).toHaveBeenCalledOnce();
        expect(mocks.create.mock.calls[0][0]).toMatchObject({
            user_id: user.id,
            token_hash: expect.any(String),
        });
        expect(res.cookie).toHaveBeenCalledOnce();
        expect(res.cookie.mock.calls[0][0]).toBe('refreshToken');
        expect(res.cookie.mock.calls[0][2]).toMatchObject({
            httpOnly: true,
            sameSite: 'strict',
            path: '/api/auth',
            maxAge: expect.any(Number),
        });
        expect(res.json).toHaveBeenCalledWith({
            message: 'Token refrescado exitosamente',
            accessToken: expect.any(String),
        });
    });

    it('rejects a refresh token whose persisted hash does not match', async () => {
        const { refreshToken, jti } = TokenManager.generateRefreshToken(user);
        mocks.findRefreshTokenById.mockResolvedValue({
            id: jti,
            user_id: user.id,
            token_hash: TokenManager.hashToken(`${refreshToken}.different`),
            expires_at: new Date(Date.now() + 60_000),
            is_revoked: false,
        });

        const res = response();
        await expect(
            AuthController.refresh(request(refreshToken), res as unknown as Response, vi.fn()),
        ).rejects.toMatchObject({ statusCode: 401 });

        expect(mocks.revokeById).not.toHaveBeenCalled();
        expect(mocks.create).not.toHaveBeenCalled();
        expect(res.clearCookie).toHaveBeenCalledOnce();
    });

    it('rejects a refresh token expired in the database', async () => {
        const { refreshToken, jti } = TokenManager.generateRefreshToken(user);
        mocks.findRefreshTokenById.mockResolvedValue({
            id: jti,
            user_id: user.id,
            token_hash: TokenManager.hashToken(refreshToken),
            expires_at: new Date(Date.now() - 1),
            is_revoked: false,
        });

        const res = response();
        await expect(
            AuthController.refresh(request(refreshToken), res as unknown as Response, vi.fn()),
        ).rejects.toMatchObject({ statusCode: 401 });

        expect(mocks.revokeById).not.toHaveBeenCalled();
        expect(res.clearCookie).toHaveBeenCalledOnce();
    });

    it('rejects a token whose database owner differs from the JWT owner', async () => {
        const { refreshToken, jti } = TokenManager.generateRefreshToken(user);
        mocks.findRefreshTokenById.mockResolvedValue({
            id: jti,
            user_id: '33333333-3333-4333-8333-333333333333',
            token_hash: TokenManager.hashToken(refreshToken),
            expires_at: new Date(Date.now() + 60_000),
            is_revoked: false,
        });

        const res = response();
        await expect(
            AuthController.refresh(request(refreshToken), res as unknown as Response, vi.fn()),
        ).rejects.toMatchObject({ statusCode: 401 });

        expect(mocks.revokeById).not.toHaveBeenCalled();
        expect(res.clearCookie).toHaveBeenCalledOnce();
    });

    it('rejects when another request already revoked the token', async () => {
        const { refreshToken, jti } = TokenManager.generateRefreshToken(user);
        mocks.findRefreshTokenById.mockResolvedValue({
            id: jti,
            user_id: user.id,
            token_hash: TokenManager.hashToken(refreshToken),
            expires_at: new Date(Date.now() + 60_000),
            is_revoked: false,
        });
        mocks.revokeById.mockResolvedValue(false);

        const res = response();
        await expect(
            AuthController.refresh(request(refreshToken), res as unknown as Response, vi.fn()),
        ).rejects.toMatchObject({ statusCode: 401 });

        expect(mocks.create).not.toHaveBeenCalled();
        expect(res.clearCookie).toHaveBeenCalledOnce();
    });

    it('revokes the user session family when a previously revoked token is reused', async () => {
        const { refreshToken, jti } = TokenManager.generateRefreshToken(user);
        mocks.findRefreshTokenById.mockResolvedValue({
            id: jti,
            user_id: user.id,
            token_hash: TokenManager.hashToken(refreshToken),
            expires_at: new Date(Date.now() + 60_000),
            is_revoked: true,
        });

        const res = response();
        await expect(
            AuthController.refresh(request(refreshToken), res as unknown as Response, vi.fn()),
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(mocks.revokeAllTokensForUser).toHaveBeenCalledWith(user.id);
        expect(res.clearCookie).toHaveBeenCalledOnce();
    });
});
