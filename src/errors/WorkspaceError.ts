export class WorkspaceNotFoundError extends Error {
    constructor() {
        super('Espacio de trabajo no encontrado');
        this.name = 'WorkspaceNotFoundError';
    }
}

export class NoFreePortError extends Error {
    constructor() {
        super('No hay puertos disponibles para el espacio de trabajo');
        this.name = 'NoFreePortError';
    }
}
