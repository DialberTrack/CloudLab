import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthenticatedError } from '../errors/auth.error.js';
import { TokenManager } from '../utils/token-manager.utils.js';
import { UserRepository } from '../repositories/user.repository.js';

export class AuthMiddleware {
    /**
     * Valida el Bearer access token y carga el usuario activo en `req.user`.
     *
     * @throws {UnauthenticatedError} Si falta, es invalido o pertenece a un usuario inactivo.
     */
    static authenticate: RequestHandler = async (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthenticatedError();
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            throw new UnauthenticatedError();
        }

        const payload = TokenManager.verifyAccessToken(token);
        if (!payload) {
            throw new UnauthenticatedError();
        }

        const user = await UserRepository.findById(payload.user_id);

        if (!user || !user.is_active) {
            throw new UnauthenticatedError('Usuario no encontrado o inactivo');
        }

        req.user = { id: payload.user_id, role: user.role };

        return next();
    };

    /**
     * Restringe el acceso a usuarios con rol `admin`.
     *
     * @throws {UnauthenticatedError} Si la autenticacion no cargo un usuario.
     * @throws {ForbiddenError} Si el usuario autenticado no es administrador.
     */
    static authorizeAdmin: RequestHandler = (req, res, next) => {
        if (!req.user) {
            throw new UnauthenticatedError();
        }

        if (req.user.role !== 'admin') {
            throw new ForbiddenError();
        }

        return next();
    };
}
