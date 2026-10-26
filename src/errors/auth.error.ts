import { AppError } from './app.error.js';

export class UnauthenticatedError extends AppError {
    constructor(message: string = 'Token de autenticación no proporcionado o inválido') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Acceso denegado. Se requiere rol de administrador.') {
        super(message, 403);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'No tienes permisos para realizar esta acción.') {
        super(message, 403);
    }
}
