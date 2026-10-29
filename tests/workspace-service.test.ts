import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getImageById: vi.fn(),
    createWorkspace: vi.fn(),
    getWorkspaceById: vi.fn(),
    updateWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    createContainer: vi.fn(),
    startContainer: vi.fn(),
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
        ).rejects.toMatchObject({ statusCode: 500 });

        expect(mocks.removeContainer).toHaveBeenCalledWith('container-id');
        expect(mocks.updateWorkspace).toHaveBeenLastCalledWith(expect.any(String), {
            status: 'error',
            error_message: 'No se pudo crear el contenedor del workspace.',
        });
    });
});
