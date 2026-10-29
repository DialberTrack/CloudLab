import type { ContainerInspectInfo, ContainerStats } from 'dockerode';
import { dockerClient } from './docker.client.js';
import type { CreateContainerOptions } from './docker.type.js';

export class DockerService {
    static async createContainer({
        image,
        vncPassword,
        workspaceId,
    }: CreateContainerOptions): Promise<ContainerInspectInfo> {
        const container = await dockerClient.createContainer({
            Image: image,
            name: `cloudlab-${workspaceId}`,
            Env: [`VNC_PASSWORD=${vncPassword}`],
            HostConfig: {
                PortBindings: {
                    '6901/tcp': [{ HostIp: '127.0.0.1', HostPort: '0' }],
                },
            },
        });

        const info = await container.inspect();

        return info;
    }

    static async startContainer(containerId: string): Promise<ContainerInspectInfo> {
        const container = dockerClient.getContainer(containerId);
        await container.start();
        return container.inspect();
    }

    static async stopContainer(containerId: string): Promise<void> {
        const container = dockerClient.getContainer(containerId);
        await container.stop();
    }

    static async restartContainer(containerId: string): Promise<void> {
        const container = dockerClient.getContainer(containerId);
        await container.restart();
    }

    static async removeContainer(containerId: string): Promise<void> {
        const container = dockerClient.getContainer(containerId);
        await container.remove({ force: true });
    }

    static getStats(containerId: string): Promise<ContainerStats> {
        const container = dockerClient.getContainer(containerId);
        return container.stats({ stream: false });
    }
}
