import type { ContainerInspectInfo, ContainerStats } from 'dockerode';
import crypto from 'node:crypto';
import { DockerService } from '../docker/docker.service.js';
import {
    DockerContainerNotFoundError,
    DockerUnavailableError,
    ImageNotFoundError,
} from '../errors/docker.error.js';
import {
    WorkspaceContainerUnavailableError,
    WorkspaceCreationError,
    WorkspaceDeletionError,
    WorkspaceOperationError,
} from '../errors/workspace.error.js';
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
                    error_message:
                        error instanceof Error
                            ? error.message
                            : 'No se pudo crear el contenedor del workspace.',
                });
            } catch (updateError: unknown) {
                logger.error('No se pudo marcar como fallido el workspace creado.', {
                    workspaceId: id,
                    error: updateError,
                });
            }

            logger.error('Error al crear el contenedor del workspace.', {
                workspaceId: id,
                error,
            });

            if (error instanceof ImageNotFoundError || error instanceof DockerUnavailableError) {
                throw error;
            }

            throw new WorkspaceCreationError();
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
                throw WorkspaceService.toOperationError(
                    error,
                    'No se pudo eliminar el contenedor del workspace.'
                );
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
        const container = await WorkspaceService.runDockerOperation(
            () => DockerService.startContainer(containerId),
            'No se pudo iniciar el workspace.'
        );

        return WorkspaceRepository.update(id, {
            status: 'running',
            port: WorkspaceService.getPublishedPort(container),
            error_message: null,
        });
    }

    static async stop(id: string, userId: string) {
        const workspace = await WorkspaceRepository.getById(id, userId);
        const containerId = WorkspaceService.requireContainerId(workspace.container_id);
        await WorkspaceService.runDockerOperation(
            () => DockerService.stopContainer(containerId),
            'No se pudo detener el workspace.'
        );

        return WorkspaceRepository.update(id, {
            status: 'stopped',
            error_message: null,
        });
    }

    static async restart(id: string, userId: string) {
        const workspace = await WorkspaceRepository.getById(id, userId);
        const containerId = WorkspaceService.requireContainerId(workspace.container_id);
        await WorkspaceService.runDockerOperation(
            () => DockerService.restartContainer(containerId),
            'No se pudo reiniciar el workspace.'
        );

        return WorkspaceRepository.update(id, {
            status: 'running',
            error_message: null,
        });
    }

    static async metrics(id: string, userId: string): Promise<ContainerStats> {
        const workspace = await WorkspaceRepository.getById(id, userId);
        const containerId = WorkspaceService.requireContainerId(workspace.container_id);

        return WorkspaceService.runDockerOperation(
            () => DockerService.getStats(containerId),
            'No se pudieron consultar las métricas del workspace.'
        );
    }

    private static requireContainerId(containerId: string | null | undefined): string {
        if (!containerId) {
            throw new WorkspaceContainerUnavailableError(
                'El workspace no tiene un contenedor disponible.'
            );
        }

        return containerId;
    }

    private static async runDockerOperation<T>(
        operation: () => Promise<T>,
        message: string
    ): Promise<T> {
        try {
            return await operation();
        } catch (error: unknown) {
            throw WorkspaceService.toOperationError(error, message);
        }
    }

    private static toOperationError(error: unknown, fallbackMessage: string): Error {
        if (error instanceof DockerContainerNotFoundError) {
            return new WorkspaceContainerUnavailableError();
        }

        if (error instanceof DockerUnavailableError) {
            return error;
        }

        logger.error(fallbackMessage, { error });
        return new WorkspaceOperationError(fallbackMessage);
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
