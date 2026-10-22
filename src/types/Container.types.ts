export type ContainerStatus =
    | 'created'
    | 'running'
    | 'paused'
    | 'restarting'
    | 'removing'
    | 'exited'
    | 'dead'
    | 'unknown';

export interface CreateContainerOptions {
    name: string;
    imageReference: string;
    hostPort: number;
    vncPassword: string;
}

export interface Container {
    id: string;
    name: string;
    imageReference: string;
    status: ContainerStatus;
    hostPort?: number;
}
