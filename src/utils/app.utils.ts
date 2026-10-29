import { randomInt } from 'node:crypto';
import { createServer } from 'node:net';

export interface PortRange {
    min: number;
    max: number;
}

/**
 * Obtiene un puerto libre y confiable de forma aleatoria dentro de un rango especificado.
 * @param options Objeto con el puerto mínimo y máximo del rango (ej. { min: 4000, max: 5000 })
 * @returns Promesa que resuelve con el número de puerto libre encontrado.
 */
export async function getAvailablePort({ min, max }: PortRange): Promise<number> {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 65535 || min > max) {
        throw new RangeError('El rango de puertos debe estar entre 1 y 65535.');
    }

    const remainingPorts = Array.from({ length: max - min + 1 }, (_, index) => min + index);

    while (remainingPorts.length > 0) {
        const index = randomInt(remainingPorts.length);
        const [port] = remainingPorts.splice(index, 1);

        if (port === undefined) {
            continue;
        }

        try {
            await new Promise<void>((resolve, reject) => {
                const server = createServer();

                server.once('error', (error) => {
                    server.close(() => reject(error));
                });
                server.listen(port, '127.0.0.1', () => {
                    server.close((error) => (error ? reject(error) : resolve()));
                });
            });

            return port;
        } catch (error) {
            if (!(error instanceof Error) || !('code' in error) || error.code !== 'EADDRINUSE') {
                throw error;
            }
        }
    }

    throw new Error(`No hay puertos libres entre ${min} y ${max}.`);
}
