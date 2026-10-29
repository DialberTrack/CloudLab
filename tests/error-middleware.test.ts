import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceNotFoundError } from '../src/errors/workspace.error.js';
import { errorMiddleware } from '../src/middlewares/error.middleware.js';

const request = {} as Request;

const response = () => {
    const res = {
        headersSent: false,
        status: vi.fn(),
        json: vi.fn(),
    };

    res.status.mockReturnValue(res);
    return res;
};

describe('errorMiddleware', () => {
    it('devuelve mensaje y código para errores de dominio', () => {
        const res = response();

        errorMiddleware(new WorkspaceNotFoundError(), request, res as unknown as Response, vi.fn());

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            error: 'El workspace solicitado no está disponible.',
            code: 'WORKSPACE_NOT_FOUND',
        });
    });

    it('oculta detalles de errores no controlados', () => {
        const res = response();

        errorMiddleware(new Error('detalle interno'), request, res as unknown as Response, vi.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Error interno del servidor',
        });
    });
});
