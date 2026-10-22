import { createServer } from 'node:net';

const WORKSPACE_PORT_RANGE = {
    start: 30000,
    end: 40000,
} as const;

const reservedPorts = new Set<number>();

export interface PortReservation {
    port: number;
    release(): void;
}

const isPortAvailable = (port: number): Promise<boolean> =>
    new Promise((resolve, reject) => {
        const server = createServer();
        server.once('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
                resolve(false);
                return;
            }
            reject(error);
        });
        server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(true);
            });
        });
    });

export const reserveWorkspacePort = async (
    usedPorts: Iterable<number | null>,
): Promise<PortReservation> => {
    const used = new Set(usedPorts);

    for (
        let port = WORKSPACE_PORT_RANGE.start;
        port <= WORKSPACE_PORT_RANGE.end;
        port += 1
    ) {
        if (used.has(port) || reservedPorts.has(port)) {
            continue;
        }

        reservedPorts.add(port);
        try {
            if (await isPortAvailable(port)) {
                return {
                    port,
                    release: () => reservedPorts.delete(port),
                };
            }
        } catch (error) {
            reservedPorts.delete(port);
            throw error;
        }
        reservedPorts.delete(port);
    }

    throw new Error(
        `No hay puertos disponibles en el rango ${WORKSPACE_PORT_RANGE.start}-${WORKSPACE_PORT_RANGE.end}.`,
    );
};
