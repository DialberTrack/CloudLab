import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getImageById: vi.fn(),
    createWorkspace: vi.fn(),
    getWorkspaceById: vi.fn(),
    updateWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    createContainer: vi.fn(),
    startContainer: vi.fn(),
    stopContainer: vi.fn(),
    restartContainer: vi.fn(),
    getStats: vi.fn(),
    removeContainer: vi.fn(),
    loggerError: vi.fn(),
}));

vi.mock('../src/repositories/container-image.repository.js', () => ({
    ContainerImageRepository: {
        getById: mocks.getImageById,
    },
}));

vi.mock('../src/repositories/workspace.repository.js', () => ({
    WorkspaceRepository: {
        create: mocks.createWorkspace,
        getById: mocks.getWorkspaceById,
        update: mocks.updateWorkspace,
        delete: mocks.deleteWorkspace,
    },
}));

vi.mock('../src/docker/docker.service.js', () => ({
    DockerService: {
        createContainer: mocks.createContainer,
        startContainer: mocks.startContainer,
        removeContainer: mocks.removeContainer,
    },
}));

vi.mock('../src/utils/logger.js', () => ({
    logger: {
        error: mocks.loggerError,
    },
}));

const { WorkspaceService } = await import('../src/services/workspace.service.js');

describe('WorkspaceService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getImageById.mockResolvedValue({ image: 'ubuntu:24.04' });
        mocks.createWorkspace.mockResolvedValue({ id: 'workspace-id' });
        mocks.getWorkspaceById.mockResolvedValue({
            id: 'workspace-id',
            container_id: 'container-id',
        });
        mocks.updateWorkspace.mockResolvedValue({ id: 'workspace-id' });
        mocks.deleteWorkspace.mockResolvedValue(true);
    });

    it('elimina el contenedor antes de borrar el workspace del usuario', async () => {
        await WorkspaceService.delete('workspace-id', 'user-id');

        expect(mocks.getWorkspaceById).toHaveBeenCalledWith('workspace-id', 'user-id');
        expect(mocks.updateWorkspace).toHaveBeenCalledWith('workspace-id', {
            status: 'deleting',
        });
        expect(mocks.removeContainer).toHaveBeenCalledWith('container-id');
        expect(mocks.deleteWorkspace).toHaveBeenCalledWith('workspace-id', 'user-id');
    });

    it('limpia el contenedor y marca el workspace como fallido si Docker falla', async () => {
        mocks.createContainer.mockResolvedValue({ Id: 'container-id' });
        mocks.startContainer.mockRejectedValue(new Error('Docker no disponible'));

        await expect(
            WorkspaceService.create({
                container_image_id: '11111111-1111-4111-8111-111111111111',
                name: 'Workspace de prueba',
                user_id: '22222222-2222-4222-8222-222222222222',
            })
        ).rejects.toMatchObject({
            statusCode: 503,
            message: 'No se pudo crear el workspace en este momento.',
        });

        expect(mocks.removeContainer).toHaveBeenCalledWith('container-id');
        expect(mocks.updateWorkspace).toHaveBeenLastCalledWith(expect.any(String), {
            status: 'error',
            error_message: 'Docker no disponible',
        });
    });

    it('mantiene el mensaje cuando la imagen no está disponible en Docker', async () => {
        const { ImageNotFoundError } = await import('../src/errors/docker.error.js');
        mocks.createContainer.mockRejectedValue(new ImageNotFoundError('ubuntu:24.04'));

        await expect(
            WorkspaceService.create({
                container_image_id: '11111111-1111-4111-8111-111111111111',
                name: 'Workspace de prueba',
                user_id: '22222222-2222-4222-8222-222222222222',
            })
        ).rejects.toMatchObject({
            statusCode: 422,
            message: "La imagen de contenedor 'ubuntu:24.04' no está disponible en Docker.",
        });
    });

    it('informa que el workspace no está disponible cuando el repositorio no lo encuentra', async () => {
        const { WorkspaceNotFoundError } = await import('../src/errors/workspace.error.js');
        mocks.getWorkspaceById.mockRejectedValue(new WorkspaceNotFoundError());

        await expect(WorkspaceService.delete('missing-workspace', 'user-id')).rejects.toMatchObject(
            {
                statusCode: 404,
                message: 'El workspace solicitado no está disponible.',
            }
        );
    });

    it('informa que el contenedor no está disponible para iniciar un workspace incompleto', async () => {
        mocks.getWorkspaceById.mockResolvedValue({
            id: 'workspace-id',
            container_id: null,
        });

        await expect(WorkspaceService.start('workspace-id', 'user-id')).rejects.toMatchObject({
            statusCode: 409,
            message: 'El workspace no tiene un contenedor disponible.',
        });
    });

    it('informa que el contenedor no está disponible si fue eliminado externamente', async () => {
        const { DockerContainerNotFoundError } = await import('../src/errors/docker.error.js');
        mocks.startContainer.mockRejectedValue(new DockerContainerNotFoundError());

        await expect(WorkspaceService.start('workspace-id', 'user-id')).rejects.toMatchObject({
            statusCode: 409,
            message: 'El contenedor del workspace no está disponible.',
        });
    });
});
