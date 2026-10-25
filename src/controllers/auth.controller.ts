import type { RequestHandler } from 'express';
import { ChangePasswordSchema, LoginSchema } from '../schemas/user.schema.js';
import { UserRepository } from '../repositories/user.repository.js';
import {
    InvalidCredentialsError,
    InvalidPasswordError,
    UserInactiveError,
} from '../errors/user.error.js';
import argon2 from 'argon2';
import { TokenManager } from '../utils/token-manager.utils.js';
import { env } from '../config/env.js';
import { RefreshTokenRepository } from '../repositories/refres-token.repository.js';
import { ForbiddenError, UnauthenticatedError } from '../errors/auth.error.js';

const refreshCookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth',
    maxAge: env.JWT_REFRESH_COOKIE_MAX_AGE_MS,
};

export class AuthController {
    static login: RequestHandler = async (req, res) => {
        const result = LoginSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: result.error.issues });
        }

        const { email, password } = result.data;

        const user = await UserRepository.findByEmail(email);

        if (!user || !(await argon2.verify(user.password, password))) {
            throw new InvalidCredentialsError();
        }

        if (!user.is_active) {
            throw new UserInactiveError();
        }

        const accessToken = TokenManager.generateAccessToken(user);
        const { refreshToken, jti } = TokenManager.generateRefreshToken(user);

        const userAgent = req.headers['user-agent'] || null;

        await RefreshTokenRepository.revokePreviousDeviceTokens(user.id, userAgent);

        await RefreshTokenRepository.create({
            id: jti,
            user_id: user.id,
            token_hash: TokenManager.hashToken(refreshToken),
            user_agent: userAgent,
            ip_address: req.ip,
            expires_at: new Date(Date.now() + env.JWT_REFRESH_COOKIE_MAX_AGE_MS),
        });

        await RefreshTokenRepository.pruneTokens(user.id, env.MAX_REFRESH_TOKENS_PER_USER);

        res.cookie('refreshToken', refreshToken, refreshCookieOptions);

        return res.json({
            message: 'Inicio de sesión exitoso',
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    };

    static logout: RequestHandler = async (req, res) => {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            const payload = TokenManager.verifyRefreshToken(refreshToken);
            if (payload) {
                await RefreshTokenRepository.revokeById(payload.jti);
            }
        }

        res.clearCookie('refreshToken', refreshCookieOptions);
        res.json({ message: 'Sesión cerrada correctamente' });
    };

    static refresh: RequestHandler = async (req, res) => {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            throw new UnauthenticatedError('No se proporcionó un token de refresco');
        }

        const payload = TokenManager.verifyRefreshToken(refreshToken);
        if (!payload) {
            throw new UnauthenticatedError('Token de refresco inválido o expirado');
        }

        const storedToken = await RefreshTokenRepository.findById(payload.jti);
        if (!storedToken) {
            throw new UnauthenticatedError('Token de refresco inválido o revocado');
        }

        if (storedToken.is_revoked) {
            await RefreshTokenRepository.revokeAllTokensForUser(storedToken.user_id);
            res.clearCookie('refreshToken', refreshCookieOptions);
            throw new ForbiddenError(
                'Token de refresco revocado. Se requiere inicio de sesión nuevamente'
            );
        }

        const user = await UserRepository.findById(payload.id);
        if (!user || !user.is_active) {
            throw new UserInactiveError(
                'Usuario inactivo o no encontrado. Contacte al administrador.'
            );
        }

        await RefreshTokenRepository.revokeById(payload.jti);

        const newAccessToken = TokenManager.generateAccessToken(user);
        const { refreshToken: newRefreshToken, jti: newJti } =
            TokenManager.generateRefreshToken(user);

        const userAgent = req.headers['user-agent'] || null;

        await RefreshTokenRepository.create({
            id: newJti,
            user_id: user.id,
            token_hash: TokenManager.hashToken(newRefreshToken),
            user_agent: userAgent,
            ip_address: req.ip,
            expires_at: new Date(Date.now() + env.JWT_REFRESH_COOKIE_MAX_AGE_MS),
        });

        await RefreshTokenRepository.pruneTokens(user.id, env.MAX_REFRESH_TOKENS_PER_USER);

        res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

        res.json({ message: 'Token refrescado exitosamente', accessToken: newAccessToken });
    };

    static me: RequestHandler = async (req, res) => {
        const user = await UserRepository.getById(req.user!.id);

        const { password, is_active, ...userInfo } = user;

        res.json({ user: userInfo });
    };

    static changePassword: RequestHandler = async (req, res) => {
        const result = ChangePasswordSchema.safeParse(req.body || {});

        if (!result.success) {
            return res.status(400).json({ error: result.error.issues });
        }

        const { current, password } = result.data;

        const user = await UserRepository.getById(req.user!.id);

        const isOldPasswordValid = await argon2.verify(user.password, current);
        if (!isOldPasswordValid) {
            throw new InvalidPasswordError();
        }

        if (current === password) {
            throw new InvalidPasswordError('La nueva contraseña no puede ser igual a la actual');
        }

        const newPasswordHash = await argon2.hash(password);
        await UserRepository.update(user.id, { password: newPasswordHash });

        await RefreshTokenRepository.revokeAllTokensForUser(user.id);

        const accessToken = TokenManager.generateAccessToken(user);
        const { refreshToken, jti } = TokenManager.generateRefreshToken(user);

        const userAgent = req.headers['user-agent'] || null;

        await RefreshTokenRepository.create({
            id: jti,
            user_id: user.id,
            token_hash: TokenManager.hashToken(refreshToken),
            user_agent: userAgent,
            ip_address: req.ip,
            expires_at: new Date(Date.now() + env.JWT_REFRESH_COOKIE_MAX_AGE_MS),
        });

        await RefreshTokenRepository.pruneTokens(user.id, env.MAX_REFRESH_TOKENS_PER_USER);

        res.cookie('refreshToken', refreshToken, refreshCookieOptions);

        res.json({ message: 'Contraseña cambiada exitosamente', accessToken });
    };
}
