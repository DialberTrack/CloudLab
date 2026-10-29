import { AppError } from './app.error.js';

export class DockerError extends AppError {
    constructor(message: string = 'Ocurrió un error al interactuar con Docker.') {
        super(message, 500);
    }
}

export class ImageNotFoundError extends AppError {
    constructor(image: string) {
        super(`La imagen de contenedor '${image}' no está disponible en Docker.`, 422);
    }
}

export class DockerUnavailableError extends AppError {
    constructor(message: string = 'El servicio de contenedores no está disponible.') {
        super(message, 503);
    }
}

export class DockerOperationError extends AppError {
    constructor(message: string = 'No se pudo completar la operación en Docker.') {
        super(message, 502);
    }
}

export class DockerContainerNotFoundError extends AppError {
    constructor(message: string = 'El contenedor del workspace ya no está disponible.') {
        super(message, 404);
    }
}
