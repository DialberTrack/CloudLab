import argon2 from 'argon2';
import type { RequestHandler } from 'express';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ValidationError } from '../errors/app.error.js';
import { ForbiddenError, UnauthenticatedError } from '../errors/auth.error.js';
import { InvalidCredentialsError, UserInactiveError } from '../errors/user.error.js';
import {
    refreshCookieOptions,
    RefreshTokenRepository,
} from '../repositories/refres-token.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { LoginSchema } from '../schemas/user.schema.js';
import { TokenManager } from '../utils/token-manager.utils.js';
export class AuthController {
    /**
     * Autentica credenciales y crea una sesion con access token y refresh token.
     *
     * @endpoint POST /api/auth/login
     * @param req Request con correo y contrasena.
     * @param res Response de Express.
     * @returns {Promise<void>} Responde con el access token y una cookie HTTP-only.
     * @throws {ValidationError} Si las credenciales no cumplen el esquema.
     * @throws {InvalidCredentialsError} Si el correo o la contrasena no son validos.
     * @throws {UserInactiveError} Si la cuenta esta inactiva.
     */
    static login: RequestHandler = async (req, res) => {
        const validation = LoginSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { email, password } = validation.data;

        const user = await UserRepository.findByEmail(email);

        const passwordIsValid = user && (await argon2.verify(user.password, password));
        if (!passwordIsValid) {
            throw new InvalidCredentialsError();
        }

        if (!user.is_active) {
            throw new UserInactiveError();
        }

        const accessToken = TokenManager.generateAccessToken(user);
        const { refreshToken, jti: refreshTokenId } = TokenManager.generateRefreshToken(user);

        const userAgent = req.headers['user-agent'] || null;

        await RefreshTokenRepository.revokePreviousDeviceTokens(user.id, userAgent);

        await RefreshTokenRepository.create({
            id: refreshTokenId,
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

    /**
     * Revoca el refresh token presentado y limpia la cookie de sesion.
     *
     * @endpoint POST /api/auth/logout
     * @param req Request que puede contener la cookie `refreshToken`.
     * @param res Response de Express.
     * @returns {Promise<void>} Responde confirmando el cierre de sesion.
     * @throws {Error} Si falla la revocacion persistida.
     */
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

    /**
     * Valida, rota y persiste un refresh token de sesion.
     *
     * @endpoint POST /api/auth/refresh
     * @param req Request con la cookie `refreshToken`.
     * @param res Response de Express.
     * @returns {Promise<void>} Responde con un nuevo access token y cookie.
     * @throws {UnauthenticatedError} Si falta, expiro, fue manipulado o ya fue revocado.
     * @throws {ForbiddenError} Si se detecta reutilizacion de un token revocado.
     * @throws {UserInactiveError} Si el usuario asociado esta inactivo o no existe.
     */
    static refresh: RequestHandler = async (req, res) => {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            throw new UnauthenticatedError('No se proporcionó un token de refresco');
        }

        const refreshTokenPayload = TokenManager.verifyRefreshToken(refreshToken);
        if (!refreshTokenPayload) {
            throw new UnauthenticatedError('Token de refresco inválido o expirado');
        }

        const storedRefreshToken = await RefreshTokenRepository.findById(refreshTokenPayload.jti);
        if (!storedRefreshToken) {
            throw new UnauthenticatedError('Token de refresco inválido o revocado');
        }

        if (storedRefreshToken.is_revoked) {
            await RefreshTokenRepository.revokeAllTokensForUser(storedRefreshToken.user_id);
            res.clearCookie('refreshToken', refreshCookieOptions);
            throw new ForbiddenError(
                'Token de refresco revocado. Se requiere inicio de sesión nuevamente'
            );
        }

        const receivedHash = TokenManager.hashToken(refreshToken);

        const storedTokenHash = Buffer.from(storedRefreshToken.token_hash, 'hex');
        const receivedTokenHash = Buffer.from(receivedHash, 'hex');

        const hashesMatch =
            storedTokenHash.length === receivedTokenHash.length &&
            crypto.timingSafeEqual(storedTokenHash, receivedTokenHash);
        const tokenIsExpired = storedRefreshToken.expires_at.getTime() <= Date.now();

        if (
            !hashesMatch ||
            storedRefreshToken.user_id !== refreshTokenPayload.user_id ||
            tokenIsExpired
        ) {
            res.clearCookie('refreshToken', refreshCookieOptions);
            throw new UnauthenticatedError('Token de refresco inválido o expirado');
        }

        const user = await UserRepository.findById(refreshTokenPayload.user_id);
        if (!user || !user.is_active) {
            throw new UserInactiveError(
                'Usuario inactivo o no encontrado. Contacte al administrador.'
            );
        }

        const tokenWasRevoked = await RefreshTokenRepository.revokeById(refreshTokenPayload.jti);
        if (!tokenWasRevoked) {
            res.clearCookie('refreshToken', refreshCookieOptions);
            throw new UnauthenticatedError('Token de refresco inválido o revocado');
        }

        const newAccessToken = TokenManager.generateAccessToken(user);
        const { refreshToken: newRefreshToken, jti: newRefreshTokenId } =
            TokenManager.generateRefreshToken(user);

        const userAgent = req.headers['user-agent'] || null;

        await RefreshTokenRepository.create({
            id: newRefreshTokenId,
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
}
