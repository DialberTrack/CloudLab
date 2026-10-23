export class ContainerImageNotFoundError extends Error {
    constructor() {
        super('Imagen contenedora no encontrada');
        this.name = 'ContainerImageNotFoundError';
    }
}

export class ImageReferenceAlreadyExistsError extends Error {
    constructor() {
        super('La referencia de imagen contenedora ya está en uso');
        this.name = 'ImageReferenceAlreadyExistsError';
    }
}
