import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('logger', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.resetModules();
        delete process.env.LOG_LEVEL;
        delete process.env.LOG_FORMAT;
    });

    it('escribe mensajes de texto con nivel y fecha', async () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
        const { logger } = await import('../src/utils/logger.js');

        logger.info('Servidor iniciado');

        expect(info).toHaveBeenCalledOnce();
        expect(info.mock.calls[0]?.[0]).toMatch(
            /^\[\d{4}-\d{2}-\d{2}T.*Z\] INFO Servidor iniciado$/
        );
    });

    it('respeta el nivel mínimo configurado', async () => {
        process.env.LOG_LEVEL = 'warn';
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { logger } = await import('../src/utils/logger.js');

        logger.debug('Detalle');
        logger.warn('Advertencia');

        expect(debug).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledOnce();
    });

    it('emite registros JSON con contexto', async () => {
        process.env.LOG_FORMAT = 'json';
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { logger } = await import('../src/utils/logger.js');

        logger.error('Fallo de conexión', { service: 'database' });

        expect(error).toHaveBeenCalledOnce();
        expect(JSON.parse(error.mock.calls[0]?.[0] as string)).toMatchObject({
            level: 'error',
            message: 'Fallo de conexión',
            context: { service: 'database' },
        });
    });
});
