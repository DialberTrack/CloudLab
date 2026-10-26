import type { RequestHandler } from 'express';
import { ChangePasswordSchema } from '../schemas/user.schema.js';
import { UserRepository } from '../repositories/user.repository.js';
import { InvalidPasswordError } from '../errors/user.error.js';
import argon2 from 'argon2';
import {
    refreshCookieOptions,
    RefreshTokenRepository,
} from '../repositories/refres-token.repository.js';
import { TokenManager } from '../utils/token-manager.utils.js';
import { env } from '../config/env.js';
import { ListUtils } from '../utils/list.utils.js';

export class UserController {
    static list: RequestHandler = async (req, res) => {
        const users = await UserRepository.list(ListUtils.parseQuery(req.query));
        res.json(users);
    };

    static create: RequestHandler = async (req, res) => {
        // Lógica para crear un nuevo usuario
    };

    static get: RequestHandler = (req, res) => {
        // Lógica para obtener un usuario específico por ID
    };

    static update: RequestHandler = (req, res) => {
        // Lógica para editar un usuario existente
    };

    static delete: RequestHandler = (req, res) => {
        // Lógica para eliminar un usuario
    };

    static resetPassword: RequestHandler = (req, res) => {
        // Lógica para restablecer la contraseña de un usuario
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

    static getProfile: RequestHandler = async (req, res) => {
        const user = await UserRepository.getById(req.user!.id);

        const { password, is_active, ...userInfo } = user;

        res.json({ user: userInfo });
    };
}
