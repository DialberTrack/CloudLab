import { AppError } from './app.error.js';

export class ContainerImageNotFoundError extends AppError {
    constructor(message: string = 'La imagen de contenedor solicitada no está disponible.') {
        super(message, 404);
    }
}

export class ImageAlreadyExistsError extends AppError {
    constructor(message: string = 'La imagen de contenedor ya existe') {
        super(message, 409);
    }
}

export class ContainerImageDeletionError extends AppError {
    constructor(message: string = 'No se pudo eliminar la imagen de contenedor') {
        super(message, 500);
    }
}
