import type { ErrorRequestHandler } from 'express';
import { UserEmailAlreadyExistsError, UserNotFoundError } from '../errors/UserErrors.js';
import {
    ContainerImageNotFoundError,
    ImageReferenceAlreadyExistsError,
} from '../errors/ContainerImageErrors.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (
        error instanceof SyntaxError &&
        'status' in error &&
        error.status === 400 &&
        'body' in error
    ) {
        return res.status(400).json({
            error: 'El cuerpo de la solicitud (JSON) está mal formado o contiene errores de sintaxis.',
        });
    }

    if (error instanceof UserNotFoundError) {
        return res.status(404).json({ error: error.message });
    }

    if (error instanceof ContainerImageNotFoundError) {
        return res.status(404).json({ error: error.message });
    }

    if (error instanceof UserEmailAlreadyExistsError) {
        return res.status(409).json({ error: error.message });
    }

    if (error instanceof ImageReferenceAlreadyExistsError) {
        return res.status(409).json({ error: error.message });
    }

    console.error('Error no controlado en una solicitud:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
};
