export class ContainerImageNotFoundError extends Error {
    constructor() {
        super('Imagen de contenedor no encontrada');
        this.name = 'ContainerImageNotFoundError';
    }
}

export class ImageReferenceAlreadyExistsError extends Error {
    constructor() {
        super('La referencia de imagen de contenedor ya está en uso');
        this.name = 'ImageReferenceAlreadyExistsError';
    }
}
