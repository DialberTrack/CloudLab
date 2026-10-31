import type { ContainerInspectInfo, ContainerStats } from 'dockerode';
import {
    DockerContainerNotFoundError,
    DockerOperationError,
    DockerUnavailableError,
    ImageNotFoundError,
} from '../errors/docker.error.js';
import { logger } from '../utils/logger.js';
import { dockerClient } from './docker.client.js';
import type { CreateContainerOptions } from './docker.type.js';

export class DockerService {
    /** Crea e inspecciona un contenedor Docker. */
    static async createContainer({
        image,
        vncPassword,
        workspaceId,
        port,
    }: CreateContainerOptions): Promise<ContainerInspectInfo> {
        const isImageAvailable = await this.isImageAvailable(image);
        if (!isImageAvailable) {
            throw new ImageNotFoundError(image);
        }

        try {
            const container = await dockerClient.createContainer({
                Image: image,
                name: `cloudlab-${workspaceId}`,
                Env: [`VNC_PW=${vncPassword}`],
                HostConfig: {
                    PortBindings: {
                        '6901/tcp': [{ HostIp: '127.0.0.1', HostPort: port }],
                    },
                },
            });

            const info = await container.inspect();

            return info;
        } catch (error: unknown) {
            throw DockerService.toOperationError(error, 'No se pudo preparar el contenedor.');
        }
    }

    /** Inicia un contenedor Docker si no esta activo. */
    static async startContainer(containerId: string): Promise<ContainerInspectInfo> {
        try {
            const container = dockerClient.getContainer(containerId);
            const currentState = await container.inspect();
            if (currentState.State?.Running || currentState.State?.Restarting) {
                return currentState;
            }

            await container.start();
            return await container.inspect();
        } catch (error: unknown) {
            throw DockerService.toOperationError(error, 'No se pudo iniciar el contenedor.');
        }
    }

    /** Detiene un contenedor Docker si esta activo. */
    static async stopContainer(containerId: string): Promise<void> {
        try {
            const container = dockerClient.getContainer(containerId);
            const currentState = await container.inspect();
            if (!currentState.State?.Running && !currentState.State?.Restarting) {
                return;
            }

            await container.stop();
        } catch (error: unknown) {
            throw DockerService.toOperationError(error, 'No se pudo detener el contenedor.');
        }
    }

    /** Reinicia un contenedor Docker si no se esta reiniciando. */
    static async restartContainer(containerId: string): Promise<void> {
        try {
            const container = dockerClient.getContainer(containerId);
            const currentState = await container.inspect();
            if (currentState.State?.Restarting) {
                return;
            }

            await container.restart();
        } catch (error: unknown) {
            throw DockerService.toOperationError(error, 'No se pudo reiniciar el contenedor.');
        }
    }

    /** Elimina un contenedor Docker. */
    static async removeContainer(containerId: string): Promise<void> {
        try {
            const container = dockerClient.getContainer(containerId);
            await container.remove({ force: true });
        } catch (error: unknown) {
            throw DockerService.toOperationError(error, 'No se pudo eliminar el contenedor.');
        }
    }

    /** Consulta las metricas de un contenedor Docker. */
    static async getStats(containerId: string): Promise<ContainerStats> {
        try {
            const container = dockerClient.getContainer(containerId);
            return await container.stats({ stream: false });
        } catch (error: unknown) {
            throw DockerService.toOperationError(error, 'No se pudieron consultar las métricas.');
        }
    }

    /** Comprueba si una imagen esta disponible en Docker. */
    static async isImageAvailable(image: string): Promise<boolean> {
        try {
            const images = await dockerClient.listImages();
            return images.some((img) => img.RepoTags?.includes(image));
        } catch (error: unknown) {
            logger.error('No se pudo consultar la disponibilidad de imágenes en Docker.', {
                error,
            });
            throw new DockerUnavailableError();
        }
    }

    /** Convierte errores de Docker en errores de dominio. */
    private static toOperationError(error: unknown, fallbackMessage: string) {
        if (DockerService.isMissingContainerError(error)) {
            return new DockerContainerNotFoundError();
        }

        logger.error(fallbackMessage, { error });
        return new DockerOperationError();
    }

    /** Detecta si un error indica que falta un contenedor. */
    private static isMissingContainerError(error: unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }

        const message =
            'message' in error && typeof error.message === 'string' ? error.message : '';
        return /no such container|container .* not found/i.test(message);
    }
}
