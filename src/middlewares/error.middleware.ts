import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app.error.js';
import { ValidationError } from '../errors/user.error.js';

export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Solicitud inválida: JSON mal formado' });
    }

    if (err instanceof ValidationError) {
        return res.status(err.statusCode).json({ error: err.message, issues: err.issues });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    console.error('🔥 Error no controlado en la solicitud:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
};
