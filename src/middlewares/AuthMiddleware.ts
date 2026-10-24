import type { RequestHandler } from 'express';

export class AuthMiddleware {
    static authenticate: RequestHandler = (req, res, next) => {
        // Lógica de autenticación aquí
        return next();
    };

    static authorizeAdmin: RequestHandler = (req, res, next) => {
        // Lógica de autorización para administradores aquí
        return next();
    };
}
