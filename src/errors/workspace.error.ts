import { AppError } from './app.error.js';

export class WorkspaceNotFoundError extends AppError {
    constructor(message: string = 'Workspace no encontrado') {
        super(message, 404);
    }
}

export class WorkspaceDeletionError extends AppError {
    constructor(message: string = 'Error al eliminar el workspace') {
        super(message, 500);
    }
}
