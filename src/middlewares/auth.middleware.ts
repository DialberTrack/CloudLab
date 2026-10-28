import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthenticatedError } from '../errors/auth.error.js';
import { UserRepository } from '../repositories/user.repository.js';
import { TokenManager } from '../utils/token-manager.utils.js';

export class AuthMiddleware {
    /**
     * Valida el token Bearer y carga los datos del usuario activo en `req.user`.
     *
     * @throws {UnauthenticatedError} Si el token falta, es invalido o pertenece
     * a un usuario inexistente o inactivo.
     */
    static authenticate: RequestHandler = async (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthenticatedError();
        }

        const accessToken = authHeader.slice('Bearer '.length).trim();
        if (!accessToken) {
            throw new UnauthenticatedError();
        }

        const payload = TokenManager.verifyAccessToken(accessToken);
        if (!payload) {
            throw new UnauthenticatedError();
        }

        const user = await UserRepository.findById(payload.user_id);
        if (!user || !user.is_active) {
            throw new UnauthenticatedError('Usuario no encontrado o inactivo');
        }

        req.user = {
            id: payload.user_id,
            role: user.role,
        };

        return next();
    };

    /**
     * Permite el acceso únicamente a usuarios con rol `admin`.
     *
     * @throws {UnauthenticatedError} Si no hay un usuario autenticado.
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
