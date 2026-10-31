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
import { getAvailablePort } from '../utils/app.utils.js';
import { logger } from '../utils/logger.js';

type CreateWorkspaceServiceInput = CreateWorkspaceInput & {
    user_id: string;
};

type ProvisionedContainer = {
    id: string;
    vncPassword: string;
    port: number | null;
};

export class WorkspaceService {
    /** Crea un workspace y su contenedor Docker. */
    static create = async (input: CreateWorkspaceServiceInput, isAdmin: boolean) => {
        const { image } = await ContainerImageRepository.getById(input.container_image_id, isAdmin);
        const id = crypto.randomUUID();

        await WorkspaceRepository.create({
            ...input,
            id,
            status: 'creating',
        });

        try {
            const provisionedContainer = await WorkspaceService.provisionContainer(id, image);

            return WorkspaceRepository.update(id, {
                status: 'running',
                vnc_password: provisionedContainer.vncPassword,
                container_id: provisionedContainer.id,
                port: provisionedContainer.port,
            });
        } catch (error: unknown) {
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

    /** Elimina un workspace y su contenedor Docker. */
    static async delete(id: string, ownerId?: string): Promise<void> {
        const workspace = await WorkspaceRepository.getById(id, ownerId);

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

        const deleted = await WorkspaceRepository.delete(id, ownerId);
        if (!deleted) {
            throw new WorkspaceDeletionError();
        }
    }

    /** Inicia el contenedor de un workspace. */
    static async start(id: string, ownerId?: string) {
        const workspace = await WorkspaceRepository.getById(id, ownerId);
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

    /** Detiene el contenedor de un workspace. */
    static async stop(id: string, ownerId?: string) {
        const workspace = await WorkspaceRepository.getById(id, ownerId);
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

    /** Reinicia el contenedor de un workspace. */
    static async restart(id: string, ownerId?: string) {
        const workspace = await WorkspaceRepository.getById(id, ownerId);
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

    /** Reintenta la operación de un workspace en error. */
    static async retry(id: string, ownerId?: string) {
        const workspace = await WorkspaceRepository.getById(id, ownerId);
        if (workspace.status !== 'error') {
            throw new WorkspaceOperationError(
                'Solo se puede reintentar un workspace que esté en estado de error.'
            );
        }

        if (workspace.container_id) {
            return WorkspaceService.start(id, ownerId);
        }

        await WorkspaceRepository.update(id, {
            status: 'creating',
            error_message: null,
        });

        try {
            const provisionedContainer = await WorkspaceService.provisionContainer(
                id,
                workspace.image
            );

            return WorkspaceRepository.update(id, {
                status: 'running',
                vnc_password: provisionedContainer.vncPassword,
                container_id: provisionedContainer.id,
                port: provisionedContainer.port,
                error_message: null,
            });
        } catch (error: unknown) {
            await WorkspaceService.markError(id, error);

            if (error instanceof ImageNotFoundError || error instanceof DockerUnavailableError) {
                throw error;
            }

            throw new WorkspaceCreationError();
        }
    }

    /** Consulta las metricas del contenedor de un workspace. */
    static async metrics(id: string, ownerId?: string): Promise<ContainerStats> {
        const workspace = await WorkspaceRepository.getById(id, ownerId);
        const containerId = WorkspaceService.requireContainerId(workspace.container_id);

        return WorkspaceService.runDockerOperation(
            () => DockerService.getStats(containerId),
            'No se pudieron consultar las métricas del workspace.'
        );
    }

    /** Obtiene el ID del contenedor o lanza un error de disponibilidad. */
    private static requireContainerId(containerId: string | null | undefined): string {
        if (!containerId) {
            throw new WorkspaceContainerUnavailableError(
                'El workspace no tiene un contenedor disponible.'
            );
        }

        return containerId;
    }

    /** Crea e inicia un contenedor para un workspace. */
    private static async provisionContainer(
        workspaceId: string,
        image: string
    ): Promise<ProvisionedContainer> {
        const vncPassword = crypto.randomBytes(8).toString('hex');
        const freePort = await getAvailablePort({ min: 40000, max: 50000 });
        let containerId: string | undefined;

        try {
            const container = await DockerService.createContainer({
                workspaceId,
                image,
                vncPassword,
                port: freePort.toString(),
            });
            containerId = container.Id;
            const startedContainer = await DockerService.startContainer(containerId);

            return {
                id: containerId,
                vncPassword,
                port: WorkspaceService.getPublishedPort(startedContainer),
            };
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

            throw error;
        }
    }

    /** Ejecuta una operacion Docker y traduce sus errores. */
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

    /** Convierte errores de Docker en errores del workspace. */
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

    /** Obtiene el puerto publicado por el contenedor. */
    private static getPublishedPort(container: ContainerInspectInfo): number | null {
        const binding = container.NetworkSettings?.Ports?.['6901/tcp']?.[0];
        const port = binding?.HostPort;

        return port ? Number(port) : null;
    }

    /** Marca un workspace como fallido y registra el error. */
    private static async markError(
        id: string,
        error: unknown,
        containerId?: string | null
    ): Promise<void> {
        try {
            await WorkspaceRepository.update(id, {
                status: 'error',
                ...(containerId !== undefined ? { container_id: containerId } : {}),
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
