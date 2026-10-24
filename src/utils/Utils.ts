import net from 'node:net';
import { NoFreePortError } from '../errors/WorkspaceError.js';

const reservedPorts = new Set<number>();

const isPortFree = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const srv = net.createServer();

        srv.once('error', () => resolve(false));
        srv.listen(port, '0.0.0.0', () => srv.close(() => resolve(true)));
    });
};

export const getFreePort = async (
    usedPorts: Iterable<number> = [],
    min = 30000,
    max = 40000
): Promise<number> => {
    const taken = new Set([...usedPorts, ...reservedPorts]);
    const candidates: number[] = [];
    for (let port = min; port <= max; port++) {
        if (!taken.has(port)) {
            candidates.push(port);
        }
    }

    while (candidates.length > 0) {
        const index = Math.floor(Math.random() * candidates.length);
        const [port] = candidates.splice(index, 1) as [number];

        if ((await isPortFree(port)) && !reservedPorts.has(port)) {
            reservedPorts.add(port);
            return port;
        }
    }

    throw new NoFreePortError();
};

export const releasePort = (port: number): void => {
    reservedPorts.delete(port);
};
