import { AppError } from './app.error.js';

export class InvalidCredentialsError extends AppError {
    constructor(message: string = 'Credenciales inválidas') {
        super(message, 401);
    }
}

export class EmailAlreadyInUseError extends AppError {
    constructor(message: string = 'El correo electrónico ya está en uso') {
        super(message, 409);
    }
}

export class UserInactiveError extends AppError {
    constructor(message: string = 'Usuario inactivo. Contacte al administrador.') {
        super(message, 403);
    }
}

export class UserNotFoundError extends AppError {
    constructor(message: string = 'Usuario no encontrado') {
        super(message, 404);
    }
}

export class UserDeletionError extends AppError {
    constructor(message: string = 'No se pudo eliminar el usuario') {
        super(message, 500);
    }
}

export class InvalidPasswordError extends AppError {
    constructor(message: string = 'Contraseña inválida') {
        super(message, 400);
    }
}

export class ValidationError extends AppError {
    public issues: unknown;
    constructor(issues: unknown, message: string = 'Error de validación') {
        super(message, 400);
        this.issues = issues;
    }
}
