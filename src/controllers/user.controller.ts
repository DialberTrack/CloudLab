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
} from '../errors/user.error.js';
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
    /**
     * Lista los usuarios administrables con paginacion y filtro opcional.
     *
     * @endpoint GET /api/admin/users
     * @param req Request de Express; los parametros de consulta se validan mediante
     * `ListUtils.parseQuery`.
     * @param res Response de Express.
     * @returns {Promise<void>} Responde con la lista y sus metadatos de paginacion.
     * @throws {AppError} Si los parametros de consulta son invalidos o falla el repositorio.
     */
    static list: RequestHandler = async (req, res) => {
        const query = ListUtils.parseQuery(req.query);
        const users = await UserRepository.list(query);

        res.json(users);
    };

    /**
     * Crea un usuario administrativo y almacena unicamente su contrasena hasheada.
     *
     * @endpoint POST /api/admin/users
     * @param req Request con nombre, correo, contrasena y rol opcional.
     * @param res Response de Express.
     * @returns {Promise<void>} Responde con el usuario creado sin el campo `password`.
     * @throws {ValidationError} Cuando el cuerpo no cumple el esquema de usuario.
     * @throws {EmailAlreadyInUseError} Si el correo ya esta registrado.
     * @throws {AppError} Si falla el hash o la persistencia.
     */
    static create: RequestHandler = async (req, res) => {
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
    };

    /**
     * Obtiene un usuario por su UUID sin exponer su contrasena.
     *
     * @endpoint GET /api/admin/users/:id
     * @param req Request cuyo parametro `id` debe ser un UUID.
     * @param res Response de Express.
     * @returns {Promise<void>} Responde con el usuario solicitado.
     * @throws {ValidationError} Si el UUID es invalido.
     * @throws {UserNotFoundError} Si el usuario no existe.
     */
    static get: RequestHandler = async (req, res) => {
        const validation = UserIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { id } = validation.data;
        const user = await UserRepository.getById(id);
        const { password: _password, ...userWithoutPassword } = user;

        res.json({ user: userWithoutPassword });
    };

    /**
     * Actualiza un usuario distinto del administrador autenticado.
     *
     * @endpoint PATCH /api/admin/users/:id
     * @param req Request con UUID y al menos un campo actualizable.
     * @param res Response de Express.
     * @returns {Promise<void>} Responde con el usuario actualizado sin su contrasena.
     * @throws {ValidationError} Si el UUID o el cuerpo son invalidos.
     * @throws {UnauthorizedError} Si se intenta modificar al propio usuario o el rol de un admin.
     * @throws {UserNotFoundError} Si el usuario no existe.
     * @throws {EmailAlreadyInUseError} Si el nuevo correo ya esta registrado.
     */
    static update: RequestHandler = async (req, res) => {
        const idValidation = UserIdSchema.safeParse(req.params);
        if (!idValidation.success) {
            throw new ValidationError(idValidation.error.issues);
        }

        const { id } = idValidation.data;

        if (req.user!.id === id) {
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
        const { password: _password, ...userWithoutPassword } = updatedUser!;

        res.json({ user: userWithoutPassword });
    };

    /**
     * Elimina un usuario no administrador y nunca permite autoeliminacion.
     *
     * @endpoint DELETE /api/admin/users/:id
     * @param req Request con UUID y el usuario autenticado en `req.user`.
     * @param res Response de Express.
     * @returns {Promise<void>} Responde cuando el borrado afecta una fila.
     * @throws {ValidationError} Si el UUID es invalido.
     * @throws {UnauthorizedError} Si el objetivo es el usuario autenticado o un admin.
     * @throws {UserNotFoundError} Si el usuario no existe.
     * @throws {UserDeletionError} Si la eliminacion no afecta ninguna fila.
     */
    static delete: RequestHandler = async (req, res) => {
        const validation = UserIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { id } = validation.data;

        if (req.user!.id === id) {
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
    };

    /**
     * Genera una contrasena temporal para un usuario no administrador.
     *
     * @endpoint POST /api/admin/users/:id/reset-password
     * @param req Request con UUID y el usuario autenticado en `req.user`.
     * @param res Response de Express.
     * @returns {Promise<void>} Responde con la contrasena temporal una sola vez.
     * @throws {ValidationError} Si el UUID es invalido.
     * @throws {UnauthorizedError} Si se intenta restablecer la propia cuenta o la de un admin.
     * @throws {UserNotFoundError} Si el usuario no existe.
     */
    static resetPassword: RequestHandler = async (req, res) => {
        const validation = UserIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { id } = validation.data;

        if (req.user!.id === id) {
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

        res.json({
            message: 'Contraseña restablecida exitosamente',
            user: {
                id: userToReset.id,
                email: userToReset.email,
                newPassword,
            },
        });
    };

    /**
     * Cambia la contrasena del usuario autenticado y rota sus sesiones.
     *
     * @endpoint POST /api/auth/change-password
     * @param req Request con las contrasenas actual y nueva.
     * @param res Response de Express.
     * @returns {Promise<void>} Responde con un nuevo access token y cookie de refresh.
     * @throws {ValidationError} Si el cuerpo es invalido.
     * @throws {InvalidPasswordError} Si la contrasena actual es incorrecta o no cambia.
     * @throws {UserNotFoundError} Si el usuario autenticado no existe.
     */
    static changePassword: RequestHandler = async (req, res) => {
        const validation = ChangePasswordSchema.safeParse(req.body || {});

        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
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

    /**
     * Devuelve los datos del usuario autenticado sin campos sensibles.
     *
     * @endpoint GET /api/auth/me
     * @param req Request con el usuario autenticado en `req.user`.
     * @param res Response de Express.
     * @returns {Promise<void>} Responde con el perfil del usuario.
     * @throws {UserNotFoundError} Si el usuario autenticado ya no existe.
     */
    static getMe: RequestHandler = async (req, res) => {
        const authenticatedUser = await UserRepository.getById(req.user!.id);
        const { password: _password, is_active: _isActive, ...userInfo } = authenticatedUser;

        res.json({ user: userInfo });
    };
}
