import { AppError } from './app.error.js';

export class InvalidCredentialsError extends AppError {
    constructor(message: string = 'Credenciales inválidas') {
        super(message, 401);
    }
}

export class UserAlreadyExistsError extends AppError {
    constructor(message: string = 'El usuario ya existe') {
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

export class InvalidPasswordError extends AppError {
    constructor(message: string = 'Contraseña inválida') {
        super(message, 400);
    }
}
