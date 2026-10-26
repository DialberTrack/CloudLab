import argon2 from 'argon2';
import type { RequestHandler } from 'express';

import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/auth.error.js';
import { EmailAlreadyInUseError, InvalidPasswordError } from '../errors/user.error.js';
import {
    refreshCookieOptions,
    RefreshTokenRepository,
} from '../repositories/refres-token.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import {
    ChangePasswordSchema,
    CreateUserSchema,
    UpdateUserSchema,
    UserIdSchema,
} from '../schemas/user.schema.js';
import { ListUtils } from '../utils/list.utils.js';
import { TokenManager } from '../utils/token-manager.utils.js';

export class UserController {
    static list: RequestHandler = async (req, res) => {
        const query = ListUtils.parseQuery(req.query);
        const users = await UserRepository.list(query);

        res.json(users);
    };

    static create: RequestHandler = async (req, res) => {
        const validation = CreateUserSchema.safeParse(req.body || {});

        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues });
        }

        const { name, email, password, role } = validation.data;

        const existingUser = await UserRepository.findByEmail(email);
        if (existingUser) {
            throw new EmailAlreadyInUseError();
        }

        const hashedPassword = await argon2.hash(password);

        const newUser = await UserRepository.create({
            name,
            email,
            password: hashedPassword,
            role,
        });

        res.json({ user: newUser });
    };

    static get: RequestHandler = async (req, res) => {
        const validation = UserIdSchema.safeParse(req.params);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues });
        }

        const { id } = validation.data;
        const user = await UserRepository.getById(id);
        const { password: _password, ...userWithoutPassword } = user;

        res.json({ user: userWithoutPassword });
    };

    static update: RequestHandler = async (req, res) => {
        const idValidation = UserIdSchema.safeParse(req.params);
        if (!idValidation.success) {
            return res.status(400).json({ error: idValidation.error.issues });
        }

        const { id } = idValidation.data;

        if (req.user!.id === id) {
            throw new UnauthorizedError();
        }

        const updateValidation = UpdateUserSchema.safeParse(req.body || {});
        if (!updateValidation.success) {
            return res.status(400).json({ error: updateValidation.error.issues });
        }

        const updates = updateValidation.data;
        const userToUpdate = await UserRepository.getById(id);

        if (updates.role && userToUpdate.role === 'admin') {
            throw new UnauthorizedError('No puedes cambiar el rol de un usuario administrador.');
        }

        if (updates.email && updates.email !== userToUpdate.email) {
            const existingUser = await UserRepository.findByEmail(updates.email);
            if (existingUser) {
                throw new EmailAlreadyInUseError();
            }
        }

        const updatedUser = await UserRepository.update(id, updates);
        const { password: _password, ...userWithoutPassword } = updatedUser!;

        res.json({ user: userWithoutPassword });
    };

    static delete: RequestHandler = async (req, res) => {
        // TODO: implementar la eliminación de usuarios.
    };

    static resetPassword: RequestHandler = (req, res) => {
        // TODO: implementar el restablecimiento de contraseñas.
    };

    static changePassword: RequestHandler = async (req, res) => {
        const validation = ChangePasswordSchema.safeParse(req.body || {});

        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues });
        }

        const { current, password: newPassword } = validation.data;
        const currentUser = await UserRepository.getById(req.user!.id);

        const isCurrentPasswordValid = await argon2.verify(currentUser.password, current);
        if (!isCurrentPasswordValid) {
            throw new InvalidPasswordError();
        }

        if (current === newPassword) {
            throw new InvalidPasswordError('La nueva contraseña no puede ser igual a la actual');
        }

        const newPasswordHash = await argon2.hash(newPassword);
        await UserRepository.update(currentUser.id, { password: newPasswordHash });

        await RefreshTokenRepository.revokeAllTokensForUser(currentUser.id);

        const accessToken = TokenManager.generateAccessToken(currentUser);
        const { refreshToken, jti } = TokenManager.generateRefreshToken(currentUser);

        const userAgent = req.headers['user-agent'] || null;

        await RefreshTokenRepository.create({
            id: jti,
            user_id: currentUser.id,
            token_hash: TokenManager.hashToken(refreshToken),
            user_agent: userAgent,
            ip_address: req.ip,
            expires_at: new Date(Date.now() + env.JWT_REFRESH_COOKIE_MAX_AGE_MS),
        });

        await RefreshTokenRepository.pruneTokens(currentUser.id, env.MAX_REFRESH_TOKENS_PER_USER);

        res.cookie('refreshToken', refreshToken, refreshCookieOptions);

        res.json({ message: 'Contraseña cambiada exitosamente', accessToken });
    };

    static getMe: RequestHandler = async (req, res) => {
        const authenticatedUser = await UserRepository.getById(req.user!.id);
        const { password: _password, is_active: _isActive, ...userInfo } = authenticatedUser;

        res.json({ user: userInfo });
    };
}
