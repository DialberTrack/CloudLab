import crypto from 'node:crypto';
import type { ContainerInspectInfo, ContainerStats } from 'dockerode';
import { DockerService } from '../docker/docker.service.js';
import { DockerError } from '../errors/docker.error.js';
import { WorkspaceDeletionError } from '../errors/workspace.error.js';
import { ContainerImageRepository } from '../repositories/container-image.repository.js';
import { WorkspaceRepository } from '../repositories/workspace.repository.js';
import type { CreateWorkspaceInput } from '../schemas/workspaces.schema.js';
import { logger } from '../utils/logger.js';

type CreateWorkspaceServiceInput = CreateWorkspaceInput & {
    user_id: string;
};

export class WorkspaceService {
    static create = async (input: CreateWorkspaceServiceInput) => {
        const { image } = await ContainerImageRepository.getById(input.container_image_id);
        const id = crypto.randomUUID();
        let containerId: string | undefined;

        await WorkspaceRepository.create({
            ...input,
            id,
            status: 'creating',
        });

        const vncPassword = crypto.randomBytes(8).toString('hex');

        try {
            const container = await DockerService.createContainer({
                workspaceId: id,
                image: image,
                vncPassword: vncPassword,
            });

            containerId = container.Id;
            const startedContainer = await DockerService.startContainer(containerId);

            return WorkspaceRepository.update(id, {
                status: 'running',
                vnc_password: vncPassword,
                container_id: containerId,
                port: WorkspaceService.getPublishedPort(startedContainer),
            });
        } catch (error: unknown) {
            if (containerId) {
                try {
                    await DockerService.removeContainer(containerId);
                } catch (cleanupError: unknown) {
                    logger.error('No se pudo limpiar el contenedor tras un fallo.', {
                        containerId,
                        error: cleanupError,
                    });
                }
            }

            try {
                await WorkspaceRepository.update(id, {
                    status: 'error',
                    error_message: 'No se pudo crear el contenedor del workspace.',
                });
            } catch (updateError: unknown) {
                logger.error('No se pudo actualizar el estado fallido del workspace.', {
                    workspaceId: id,
                    error: updateError,
                });
            }

            logger.error('Error al crear el contenedor del workspace.', {
                workspaceId: id,
                error,
            });
            throw new DockerError();
        }
    };

    static async delete(id: string, userId: string): Promise<void> {
        const workspace = await WorkspaceRepository.getById(id, userId);

        if (workspace.container_id) {
            await WorkspaceRepository.update(id, { status: 'deleting' });
            try {
                await DockerService.removeContainer(workspace.container_id);
            } catch (error: unknown) {
                await WorkspaceService.markError(id, error);
                throw new DockerError('No se pudo eliminar el contenedor del workspace.');
            }
        }

        const deleted = await WorkspaceRepository.delete(id, userId);
        if (!deleted) {
            throw new WorkspaceDeletionError();
        }
    }

    static async start(id: string, userId: string) {
        const workspace = await WorkspaceRepository.getById(id, userId);
        const containerId = WorkspaceService.requireContainerId(workspace.container_id);
        const container = await DockerService.startContainer(containerId);

        return WorkspaceRepository.update(id, {
            status: 'running',
            port: WorkspaceService.getPublishedPort(container),
            error_message: null,
        });
    }

    static async stop(id: string, userId: string) {
        const workspace = await WorkspaceRepository.getById(id, userId);
        const containerId = WorkspaceService.requireContainerId(workspace.container_id);
        await DockerService.stopContainer(containerId);

        return WorkspaceRepository.update(id, {
            status: 'stopped',
            error_message: null,
        });
    }

    static async restart(id: string, userId: string) {
        const workspace = await WorkspaceRepository.getById(id, userId);
        const containerId = WorkspaceService.requireContainerId(workspace.container_id);
        await DockerService.restartContainer(containerId);

        return WorkspaceRepository.update(id, {
            status: 'running',
            error_message: null,
        });
    }

    static async metrics(id: string, userId: string): Promise<ContainerStats> {
        const workspace = await WorkspaceRepository.getById(id, userId);
        const containerId = WorkspaceService.requireContainerId(workspace.container_id);

        return DockerService.getStats(containerId);
    }

    private static requireContainerId(containerId: string | null | undefined): string {
        if (!containerId) {
            throw new DockerError('El workspace no tiene un contenedor asociado.');
        }

        return containerId;
    }

    private static getPublishedPort(container: ContainerInspectInfo): number | null {
        const binding = container.NetworkSettings?.Ports?.['6901/tcp']?.[0];
        const port = binding?.HostPort;

        return port ? Number(port) : null;
    }

    private static async markError(id: string, error: unknown): Promise<void> {
        try {
            await WorkspaceRepository.update(id, {
                status: 'error',
                error_message: 'No se pudo completar la operación del contenedor.',
            });
        } catch (updateError: unknown) {
            logger.error('No se pudo actualizar el estado fallido del workspace.', {
                workspaceId: id,
                error: updateError,
            });
        }

        logger.error('Falló una operación del contenedor del workspace.', {
            workspaceId: id,
            error,
        });
    }
}
