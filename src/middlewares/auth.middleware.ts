import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthenticatedError } from '../errors/auth.error.js';
import { TokenManager } from '../utils/token-manager.utils.js';
import { UserRepository } from '../repositories/user.repository.js';

export class AuthMiddleware {
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

        const user = await UserRepository.findById(payload.id);

        if (!user || !user.is_active) {
            throw new UnauthenticatedError('Usuario no encontrado o inactivo');
        }

        req.user = { ...payload, role: user.role };

        return next();
    };

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
