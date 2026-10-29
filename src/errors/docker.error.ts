import { AppError } from './app.error.js';

export class DockerError extends AppError {
    constructor(message: string = 'Ocurrió un error al interactuar con Docker.') {
        super(message, 500);
    }
}
