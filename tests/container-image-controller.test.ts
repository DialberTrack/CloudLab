import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContainerImage } from '../src/schemas/container-image.schema.js';

const mocks = vi.hoisted(() => ({
    list: vi.fn(),
    findByImage: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
}));

vi.mock('../src/repositories/container-image.repository.js', () => ({
    ContainerImageRepository: mocks,
}));

const { ContainerImageController } =
    await import('../src/controllers/container-image.controller.js');

const image: ContainerImage = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Ubuntu',
    image: 'ubuntu:24.04',
    description: 'Ubuntu LTS',
    icon: null,
    is_active: true,
    sort_order: 1,
    created_at: new Date(),
    updated_at: new Date(),
};

const request = (params: Record<string, string> = {}, body: unknown = {}): Request =>
    ({ params, body }) as unknown as Request;

const response = () => ({ json: vi.fn() });

describe('ContainerImageController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.list.mockResolvedValue([image]);
        mocks.findByImage.mockResolvedValue(null);
        mocks.getById.mockResolvedValue(image);
        mocks.create.mockResolvedValue(image);
        mocks.update.mockResolvedValue(image);
        mocks.delete.mockResolvedValue(true);
    });

    describe('list', () => {
        it('devuelve el catálogo de imágenes activas', async () => {
            const res = response();

            await ContainerImageController.list(request(), res as unknown as Response, vi.fn());

            expect(mocks.list).toHaveBeenCalledWith(false);
            expect(res.json).toHaveBeenCalledWith({ data: [image] });
        });

        it('incluye imágenes inactivas cuando el solicitante es administrador', async () => {
            const res = response();

            await ContainerImageController.list(
                {
                    ...request(),
                    user: {
                        id: '33333333-3333-4333-8333-333333333333',
                        role: 'admin',
                    },
                } as unknown as Request,
                res as unknown as Response,
                vi.fn()
            );

            expect(mocks.list).toHaveBeenCalledWith(true);
        });

        it('solicita solo imágenes activas para un usuario normal', async () => {
            await ContainerImageController.get(
                request({ id: image.id }),
                response() as unknown as Response,
                vi.fn()
            );

            expect(mocks.getById).toHaveBeenCalledWith(image.id, false);
        });

        it('solicita imágenes inactivas cuando un administrador consulta por ID', async () => {
            await ContainerImageController.get(
                {
                    ...request({ id: image.id }),
                    user: {
                        id: '33333333-3333-4333-8333-333333333333',
                        role: 'admin',
                    },
                } as unknown as Request,
                response() as unknown as Response,
                vi.fn()
            );

            expect(mocks.getById).toHaveBeenCalledWith(image.id, true);
        });
    });

    describe('create', () => {
        it('crea una imagen válida', async () => {
            const res = response();

            await ContainerImageController.create(
                request({}, { name: 'Ubuntu', image: 'ubuntu:24.04' }),
                res as unknown as Response,
                vi.fn()
            );

            expect(mocks.findByImage).toHaveBeenCalledWith('ubuntu:24.04');
            expect(mocks.create).toHaveBeenCalledWith({
                name: 'Ubuntu',
                image: 'ubuntu:24.04',
                description: undefined,
                icon: undefined,
                sort_order: 0,
                is_active: true,
            });
            expect(res.json).toHaveBeenCalledWith({ data: image });
        });

        it('rechaza una imagen duplicada con 409', async () => {
            mocks.findByImage.mockResolvedValue(image);

            await expect(
                ContainerImageController.create(
                    request({}, { name: 'Ubuntu', image: 'ubuntu:24.04' }),
                    response() as unknown as Response,
                    vi.fn()
                )
            ).rejects.toMatchObject({ statusCode: 409 });

            expect(mocks.create).not.toHaveBeenCalled();
        });

        it('rechaza un body inválido con 400', async () => {
            await expect(
                ContainerImageController.create(
                    request({}, { name: 'x', image: 'not valid image' }),
                    response() as unknown as Response,
                    vi.fn()
                )
            ).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('update', () => {
        it('actualiza una imagen y permite conservar su referencia', async () => {
            const res = response();

            await ContainerImageController.update(
                request({ id: image.id }, { name: 'Ubuntu LTS' }),
                res as unknown as Response,
                vi.fn()
            );

            expect(mocks.findByImage).not.toHaveBeenCalled();
            expect(mocks.update).toHaveBeenCalledWith(image.id, { name: 'Ubuntu LTS' });
            expect(res.json).toHaveBeenCalledWith({ data: image });
        });

        it('rechaza cambiar a una referencia duplicada con 409', async () => {
            mocks.findByImage.mockResolvedValue({
                ...image,
                id: '22222222-2222-4222-8222-222222222222',
            });

            await expect(
                ContainerImageController.update(
                    request({ id: image.id }, { image: 'node:22' }),
                    response() as unknown as Response,
                    vi.fn()
                )
            ).rejects.toMatchObject({ statusCode: 409 });

            expect(mocks.update).not.toHaveBeenCalled();
        });

        it('rechaza un UUID inválido con 400', async () => {
            await expect(
                ContainerImageController.update(
                    request({ id: 'invalid' }, { name: 'Ubuntu LTS' }),
                    response() as unknown as Response,
                    vi.fn()
                )
            ).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('get and delete', () => {
        it('propaga 404 al consultar una imagen inexistente', async () => {
            mocks.getById.mockRejectedValue({ statusCode: 404 });

            await expect(
                ContainerImageController.get(
                    request({ id: image.id }),
                    response() as unknown as Response,
                    vi.fn()
                )
            ).rejects.toMatchObject({ statusCode: 404 });
        });

        it('devuelve 500 cuando el borrado no afecta filas', async () => {
            mocks.delete.mockResolvedValue(false);

            await expect(
                ContainerImageController.delete(
                    request({ id: image.id }),
                    response() as unknown as Response,
                    vi.fn()
                )
            ).rejects.toMatchObject({ statusCode: 500 });
        });

        it('elimina una imagen cuando MariaDB reporta una fila afectada', async () => {
            const res = response();

            await ContainerImageController.delete(
                request({ id: image.id }),
                res as unknown as Response,
                vi.fn()
            );

            expect(mocks.delete).toHaveBeenCalledWith(image.id);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Imagen de contenedor eliminada correctamente.',
            });
        });
    });
});
