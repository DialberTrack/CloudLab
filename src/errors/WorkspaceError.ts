export class WorkspaceNotFoundError extends Error {
    constructor() {
        super('Espacio de trabajo no encontrado');
        this.name = 'WorkspaceNotFoundError';
    }
}
