import { AppError } from './app.error.js';

export class WorkspaceNotFoundError extends AppError {
    constructor(message: string = 'El workspace solicitado no está disponible.') {
        super(message, 404);
    }
}

export class WorkspaceDeletionError extends AppError {
    constructor(message: string = 'No se pudo eliminar el workspace.') {
        super(message, 502);
    }
}

export class WorkspaceContainerUnavailableError extends AppError {
    constructor(message: string = 'El contenedor del workspace no está disponible.') {
        super(message, 409);
    }
}

export class WorkspaceCreationError extends AppError {
    constructor(message: string = 'No se pudo crear el workspace en este momento.') {
        super(message, 503);
    }
}

export class WorkspaceOperationError extends AppError {
    constructor(message: string) {
        super(message, 503);
    }
}
