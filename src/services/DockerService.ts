import Docker from 'dockerode';
import type { Container, CreateContainerOptions } from '../types/Container.types.js';
import { CreateContainerError, FailedToStartContainerError } from '../errors/ContainerError.js';
const docker = new Docker();

const KASM_VNC_PORT = 6901;
const KASM_VNC_PROTOCOL = 'tcp';
const KASM_VNC_PORT_KEY = `${KASM_VNC_PORT}/${KASM_VNC_PROTOCOL}` as const;

export class DockerService {
    static async createContainer(options: CreateContainerOptions): Promise<Container> {
        try {
            const dockerContainer = await docker.createContainer({
                Image: options.imageReference,
                name: options.name,
                Env: [`VNC_PW=${options.vncPassword}`],
                ExposedPorts: { [KASM_VNC_PORT_KEY]: {} },
                HostConfig: {
                    PortBindings: {
                        [KASM_VNC_PORT_KEY]: [
                            {
                                HostIp: '127.0.0.1',
                                HostPort: options.hostPort.toString(),
                            },
                        ],
                    },
                },
            });

            return {
                id: dockerContainer.id,
                name: options.name,
                imageReference: options.imageReference,
                hostPort: options.hostPort,
            };
        } catch (error) {
            throw new CreateContainerError();
        }
    }

    static async startContainer(containerId: string): Promise<void> {
        const container = docker.getContainer(containerId);
        try {
            await container.start();
        } catch (error) {
            throw new FailedToStartContainerError();
        }
    }

    static async removeContainer(containerId: string): Promise<void> {
        const container = docker.getContainer(containerId);
        await container.remove({ force: true });
    }

    static async stopContainer(containerId: string): Promise<void> {
        const container = docker.getContainer(containerId);
        await container.stop();
    }
}
