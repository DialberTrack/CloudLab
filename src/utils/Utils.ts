import net from 'node:net';

export const getFreePort = (min = 50000, max = 65535): Promise<number> => {
    return new Promise((resolve, reject) => {
        const port = Math.floor(Math.random() * (max - min + 1)) + min;

        const srv = net.createServer();

        srv.listen(port, '0.0.0.0');

        srv.on('listening', () => {
            srv.close((err) => {
                if (err) reject(err);
                else resolve(port);
            });
        });

        srv.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(getFreePort(min, max));
            } else {
                reject(err);
            }
        });
    });
};
