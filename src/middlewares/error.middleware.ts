import type { ErrorRequestHandler } from 'express';
import { AppError, ValidationError } from '../errors/app.error.js';
import { logger } from '../utils/logger.js';

/** Middleware para manejar errores en la aplicación. */
export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const isMalformedJson =
        err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err;

    if (isMalformedJson) {
        return res.status(400).json({ error: 'Solicitud inválida: JSON mal formado' });
    }

    if (err instanceof ValidationError) {
        return res
            .status(err.statusCode)
            .json({ error: err.message, code: err.code, issues: err.issues });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }

    logger.error('Error no controlado en la solicitud', { error: err });
    return res.status(500).json({ error: 'Error interno del servidor' });
};
