import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../src/schemas/user.schema.js';

const mocks = vi.hoisted(() => ({
    getById: vi.fn(),
    delete: vi.fn(),
}));

vi.mock('../src/repositories/user.repository.js', () => ({
    UserRepository: {
        getById: mocks.getById,
        delete: mocks.delete,
    },
}));

const { UserController } = await import('../src/controllers/user.controller.js');

const admin: User = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Admin',
    email: 'admin@example.com',
    password: 'hashed',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    is_active: true,
};

const regularUser: User = {
    ...admin,
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Usuario',
    email: 'user@example.com',
    role: 'user',
};

const request = (id: string, authenticatedUser = admin): Request =>
    ({
        params: { id },
        user: authenticatedUser,
    }) as unknown as Request;

const response = () => ({ json: vi.fn() });

describe('UserController.delete', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getById.mockResolvedValue(regularUser);
        mocks.delete.mockResolvedValue(true);
    });

    it('elimina un usuario normal y confirma la respuesta', async () => {
        const res = response();

        await UserController.delete(request(regularUser.id), res as unknown as Response, vi.fn());

        expect(mocks.getById).toHaveBeenCalledWith(regularUser.id);
        expect(mocks.delete).toHaveBeenCalledWith(regularUser.id);
        expect(res.json).toHaveBeenCalledWith({ message: 'Usuario eliminado exitosamente' });
    });

    it('rechaza la autoeliminacion con 403 sin consultar ni borrar', async () => {
        const res = response();

        await expect(
            UserController.delete(request(admin.id), res as unknown as Response, vi.fn()),
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(mocks.getById).not.toHaveBeenCalled();
        expect(mocks.delete).not.toHaveBeenCalled();
    });

    it('rechaza borrar otro administrador con 403', async () => {
        mocks.getById.mockResolvedValue(admin);
        const res = response();

        await expect(
            UserController.delete(request(regularUser.id), res as unknown as Response, vi.fn()),
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(mocks.delete).not.toHaveBeenCalled();
    });

    it('propaga 404 cuando el repositorio no encuentra el usuario', async () => {
        mocks.getById.mockRejectedValue({ statusCode: 404 });
        const res = response();

        await expect(
            UserController.delete(request(regularUser.id), res as unknown as Response, vi.fn()),
        ).rejects.toMatchObject({ statusCode: 404 });

        expect(mocks.delete).not.toHaveBeenCalled();
    });

    it('devuelve 400 para un UUID invalido', async () => {
        const res = response();

        await expect(
            UserController.delete(request('not-a-uuid'), res as unknown as Response, vi.fn()),
        ).rejects.toMatchObject({ statusCode: 400 });

        expect(mocks.getById).not.toHaveBeenCalled();
    });

    it('devuelve 500 si el repositorio no reporta filas afectadas', async () => {
        mocks.delete.mockResolvedValue(false);
        const res = response();

        await expect(
            UserController.delete(request(regularUser.id), res as unknown as Response, vi.fn()),
        ).rejects.toMatchObject({ statusCode: 500 });
    });
});
