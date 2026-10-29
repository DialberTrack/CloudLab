import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getContainer: vi.fn(),
    inspect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn(),
    loggerError: vi.fn(),
}));

vi.mock('../src/docker/docker.client.js', () => ({
    dockerClient: {
        getContainer: mocks.getContainer,
    },
}));

vi.mock('../src/utils/logger.js', () => ({
    logger: {
        error: mocks.loggerError,
    },
}));

const { DockerService } = await import('../src/docker/docker.service.js');

describe('DockerService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getContainer.mockReturnValue({
            inspect: mocks.inspect,
            start: mocks.start,
            stop: mocks.stop,
            restart: mocks.restart,
        });
        mocks.inspect.mockResolvedValue({ State: { Running: false, Restarting: false } });
    });

    it('no inicia un contenedor que ya está ejecutándose', async () => {
        const state = { State: { Running: true, Restarting: false } };
        mocks.inspect.mockResolvedValue(state);

        await expect(DockerService.startContainer('container-id')).resolves.toBe(state);

        expect(mocks.start).not.toHaveBeenCalled();
    });

    it('no detiene un contenedor que ya está detenido', async () => {
        await DockerService.stopContainer('container-id');

        expect(mocks.stop).not.toHaveBeenCalled();
    });

    it('no reinicia un contenedor que Docker ya está reiniciando', async () => {
        mocks.inspect.mockResolvedValue({ State: { Running: true, Restarting: true } });

        await DockerService.restartContainer('container-id');

        expect(mocks.restart).not.toHaveBeenCalled();
    });
});
