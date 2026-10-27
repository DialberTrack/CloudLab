import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('../src/config/mariadb.config.js', () => ({
    default: { query: mocks.query },
}));

const { MariaDBContainerImageRepository } = await import(
    '../src/repositories/mariadb/container-image.repository.js'
);

describe('MariaDBContainerImageRepository', () => {
    beforeEach(() => vi.clearAllMocks());

    it('lista únicamente imágenes activas ordenadas para el catálogo', async () => {
        mocks.query.mockResolvedValue([[], []]);

        await new MariaDBContainerImageRepository().list(false);

        expect(mocks.query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE is_active = 1'),
        );
        expect(mocks.query).toHaveBeenCalledWith(
            expect.stringContaining('ORDER BY sort_order ASC, name ASC'),
        );
    });

    it('omite el filtro de actividad cuando se solicitan todas las imágenes', async () => {
        mocks.query.mockResolvedValue([[], []]);

        await new MariaDBContainerImageRepository().list(true);

        expect(mocks.query).toHaveBeenCalledWith(
            expect.not.stringContaining('WHERE is_active = 1'),
        );
    });

    it('no devuelve una imagen inactiva para un usuario normal', async () => {
        mocks.query.mockResolvedValue([
            [{ id: 'image-id', image: 'ubuntu:24.04', is_active: false }],
        ]);

        await expect(new MariaDBContainerImageRepository().getById('image-id')).rejects.toMatchObject(
            { statusCode: 404 },
        );
    });

    it('devuelve una imagen inactiva cuando un administrador la solicita', async () => {
        const inactiveImage = {
            id: 'image-id',
            image: 'ubuntu:24.04',
            is_active: false,
        };
        mocks.query.mockResolvedValue([[inactiveImage]]);

        await expect(
            new MariaDBContainerImageRepository().getById('image-id', true),
        ).resolves.toEqual(inactiveImage);
    });

    it('omite campos undefined al crear una imagen', async () => {
        mocks.query
            .mockResolvedValueOnce([{ insertId: 1 }])
            .mockResolvedValueOnce([
                [
                    {
                        id: '11111111-1111-4111-8111-111111111111',
                        name: 'Ubuntu',
                        image: 'ubuntu:24.04',
                    },
                ],
            ]);

        await new MariaDBContainerImageRepository().create({
            name: 'Ubuntu',
            image: 'ubuntu:24.04',
            description: undefined,
            icon: undefined,
            is_active: true,
            sort_order: 0,
        });

        expect(mocks.query).toHaveBeenNthCalledWith(
            1,
            'INSERT INTO container_images SET ?',
            [{ name: 'Ubuntu', image: 'ubuntu:24.04', is_active: true, sort_order: 0 }],
        );
    });

    it('devuelve false cuando el borrado no afecta filas', async () => {
        mocks.query.mockResolvedValue([{ affectedRows: 0 }]);

        await expect(new MariaDBContainerImageRepository().delete('missing-id')).resolves.toBe(
            false,
        );
    });

    it('devuelve true cuando el borrado afecta una fila', async () => {
        mocks.query.mockResolvedValue([{ affectedRows: 1 }]);

        await expect(new MariaDBContainerImageRepository().delete('image-id')).resolves.toBe(true);
    });

    it('propaga errores de MariaDB', async () => {
        const databaseError = new Error('database unavailable');
        mocks.query.mockRejectedValue(databaseError);

        await expect(new MariaDBContainerImageRepository().delete('image-id')).rejects.toBe(
            databaseError,
        );
    });
});
