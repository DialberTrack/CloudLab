export class CreateContainerError extends Error {
    constructor() {
        super('Error al crear el contenedor');
        this.name = 'CreateContainerError';
    }
}

export class FailedToStartContainerError extends Error {
    constructor() {
        super('Error al iniciar el contenedor');
        this.name = 'FailedToStartContainerError';
    }
}
