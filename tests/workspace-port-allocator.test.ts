import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import test from 'node:test';
import { reserveWorkspacePort } from '../src/utils/WorkspacePortAllocator.js';

test('reserveWorkspacePort selects a port unused in Lowdb and available on localhost', async () => {
    const reservation = await reserveWorkspacePort([30000, 30001, null]);

    assert.ok(reservation.port >= 30002 && reservation.port <= 40000);
    reservation.release();
});

test('reserveWorkspacePort skips a port already bound on localhost', async (context) => {
    const server = createServer();
    try {
        await new Promise<void>((resolve, reject) => {
            server.once('error', reject);
            server.listen({ host: '127.0.0.1', port: 30000 }, resolve);
        });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
            context.skip('Port 30000 is already occupied by another process.');
            return;
        }
        throw error;
    }

    try {
        const reservation = await reserveWorkspacePort([]);
        assert.notEqual(reservation.port, 30000);
        reservation.release();
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
    }
});

test('reserveWorkspacePort avoids concurrent reservations and allows released ports', async () => {
    const [first, second] = await Promise.all([
        reserveWorkspacePort([]),
        reserveWorkspacePort([]),
    ]);

    assert.notEqual(first.port, second.port);

    first.release();
    const reused = await reserveWorkspacePort([]);
    assert.equal(reused.port, first.port);
    second.release();
    reused.release();
});

test('reserveWorkspacePort fails when the configured range is occupied in Lowdb', async () => {
    const reservations = Array.from({ length: 10001 }, (_, index) => 30000 + index);

    await assert.rejects(
        reserveWorkspacePort(reservations),
        /No hay puertos disponibles en el rango 30000-40000/,
    );
});
