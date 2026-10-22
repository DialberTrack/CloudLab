import Docker from 'dockerode';
import type {
    Container,
    ContainerStatus,
    CreateContainerOptions,
} from '../types/Container.types.js';

const KASM_VNC_PORT = 6901;
const KASM_VNC_PROTOCOL = 'tcp';
const KASM_VNC_PORT_KEY = `${KASM_VNC_PORT}/${KASM_VNC_PROTOCOL}`;

const validStatuses = new Set<ContainerStatus>([
    'created',
    'running',
    'paused',
    'restarting',
    'removing',
    'exited',
    'dead',
]);

export class DockerContainerService {
    constructor(private readonly docker = new Docker()) {}

    async create(options: CreateContainerOptions): Promise<Container> {
        const dockerContainer = await this.docker.createContainer({
            Image: options.imageReference,
            name: options.name,
            ExposedPorts: { [KASM_VNC_PORT_KEY]: {} },
            HostConfig: {
                PortBindings: {
                    [KASM_VNC_PORT_KEY]: [
                        { HostIp: '127.0.0.1', HostPort: String(options.hostPort) },
                    ],
                },
            },
            Env: [`VNC_PW=${options.vncPassword}`],
        });

        return {
            id: dockerContainer.id,
            name: options.name,
            imageReference: options.imageReference,
            status: 'created',
            hostPort: options.hostPort,
        };
    }

    async get(id: string): Promise<Container> {
        const container = this.docker.getContainer(id);
        return this.toContainer(await container.inspect());
    }

    async start(id: string): Promise<void> {
        await this.docker.getContainer(id).start();
    }

    async stop(id: string): Promise<void> {
        await this.docker.getContainer(id).stop();
    }

    async restart(id: string): Promise<void> {
        await this.docker.getContainer(id).restart();
    }

    async remove(id: string): Promise<void> {
        await this.docker.getContainer(id).remove();
    }

    private toContainer(details: Docker.ContainerInspectInfo): Container {
        return {
            id: details.Id,
            name: details.Name.replace(/^\//, ''),
            imageReference: details.Config.Image,
            status: this.toStatus(details.State.Status),
            ...this.getHostPort(details.NetworkSettings.Ports[KASM_VNC_PORT_KEY]?.[0]?.HostPort),
        };
    }

    private getHostPort(hostPort: number | string | undefined): { hostPort?: number } {
        if (hostPort === undefined || hostPort === '') {
            return {};
        }

        const parsedHostPort = Number(hostPort);
        return Number.isInteger(parsedHostPort) && parsedHostPort > 0
            ? { hostPort: parsedHostPort }
            : {};
    }

    private toStatus(status: string): ContainerStatus {
        const normalizedStatus = status.toLowerCase() as ContainerStatus;
        return validStatuses.has(normalizedStatus) ? normalizedStatus : 'unknown';
    }
}
