import argon2 from 'argon2';
import type { RequestHandler } from 'express';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ValidationError } from '../errors/app.error.js';
import { UnauthorizedError } from '../errors/auth.error.js';
import {
    EmailAlreadyInUseError,
    InvalidPasswordError,
    UserDeletionError,
    UserNotFoundError,
} from '../errors/user.error.js';
import {
    refreshCookieOptions,
    RefreshTokenRepository,
} from '../repositories/refresh-token.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import {
    ChangePasswordSchema,
    CreateUserSchema,
    UpdateUserSchema,
    UserIdSchema,
} from '../schemas/user.schema.js';
import { authed } from '../types/auth-request.js';
import { ListUtils } from '../utils/list.utils.js';
import { TokenManager } from '../utils/token-manager.utils.js';

export class UserController {
    /** Lista los usuarios administrables con paginacion y filtro opcional. */
    static list: RequestHandler = authed(async (req, res) => {
        const query = ListUtils.parseQuery(req.query);
        const users = await UserRepository.list(query);

        res.json(users);
    });

    /** Crea un usuario y almacena unicamente su contrasena hasheada. */
    static create: RequestHandler = authed(async (req, res) => {
        const validation = CreateUserSchema.safeParse(req.body || {});

        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { email, password } = validation.data;

        const existingUser = await UserRepository.findByEmail(email);
        if (existingUser) {
            throw new EmailAlreadyInUseError();
        }

        const hashedPassword = await argon2.hash(password);
        validation.data.password = hashedPassword;

        const newUser = await UserRepository.create(validation.data);

        const { password: _password, ...newUserWithoutPassword } = newUser;

        res.json({ user: newUserWithoutPassword });
    });

    /** Obtiene un usuario por UUID sin exponer su contrasena. */
    static get: RequestHandler = authed(async (req, res) => {
        const validation = UserIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { id } = validation.data;
        const user = await UserRepository.getById(id);
        const { password: _password, ...userWithoutPassword } = user;

        res.json({ user: userWithoutPassword });
    });

    /** Actualiza un usuario distinto del administrador autenticado. */
    static update: RequestHandler = authed(async (req, res) => {
        const idValidation = UserIdSchema.safeParse(req.params);
        if (!idValidation.success) {
            throw new ValidationError(idValidation.error.issues);
        }

        const { id } = idValidation.data;

        if (req.user.id === id) {
            throw new UnauthorizedError();
        }

        const updateValidation = UpdateUserSchema.safeParse(req.body || {});
        if (!updateValidation.success) {
            throw new ValidationError(updateValidation.error.issues);
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
        if (!updatedUser) {
            throw new UserNotFoundError();
        }

        const { password: _password, ...userWithoutPassword } = updatedUser;

        res.json({ user: userWithoutPassword });
    });

    /** Elimina un usuario no administrador y evita la autoeliminacion. */
    static delete: RequestHandler = authed(async (req, res) => {
        const validation = UserIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { id } = validation.data;

        if (req.user.id === id) {
            throw new UnauthorizedError('No puedes eliminar tu propio usuario.');
        }

        const userToDelete = await UserRepository.getById(id);

        if (userToDelete.role === 'admin') {
            throw new UnauthorizedError('No puedes eliminar un usuario administrador.');
        }

        const deleted = await UserRepository.delete(id);

        if (!deleted) {
            throw new UserDeletionError();
        }

        res.json({ message: 'Usuario eliminado exitosamente' });
    });

    /** Genera una contrasena temporal para un usuario no administrador. */
    static resetPassword: RequestHandler = authed(async (req, res) => {
        const validation = UserIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { id } = validation.data;

        if (req.user.id === id) {
            throw new UnauthorizedError('No puedes restablecer tu propia contraseña.');
        }

        const userToReset = await UserRepository.getById(id);

        if (userToReset.role === 'admin') {
            throw new UnauthorizedError(
                'No puedes restablecer la contraseña de un usuario administrador.'
            );
        }

        const newPassword = crypto.randomBytes(6).toString('hex');
        const hashedPassword = await argon2.hash(newPassword);

        await UserRepository.update(id, { password: hashedPassword });

        await RefreshTokenRepository.revokeAllTokensForUser(id);

        res.json({
            message: 'Contraseña restablecida exitosamente',
            user: {
                id: userToReset.id,
                email: userToReset.email,
                newPassword,
            },
        });
    });

    /** Cambia la contrasena y rota las sesiones del usuario autenticado. */
    static changePassword: RequestHandler = authed(async (req, res) => {
        const validation = ChangePasswordSchema.safeParse(req.body || {});

        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { current, password: newPassword } = validation.data;
        const currentUser = await UserRepository.getById(req.user.id);

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
    });

    /** Devuelve los datos del usuario autenticado sin campos sensibles. */
    static getMe: RequestHandler = authed(async (req, res) => {
        const authenticatedUser = await UserRepository.getById(req.user.id);
        const { password: _password, is_active: _isActive, ...userInfo } = authenticatedUser;

        res.json({ user: userInfo });
    });
}
