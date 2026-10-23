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
    hostPort: number;
}
