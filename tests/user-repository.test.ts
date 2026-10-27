import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('../src/config/mariadb.config.js', () => ({
    default: { query: mocks.query },
}));

const { MariaDBUserRepository } = await import('../src/repositories/mariadb/user.repository.js');

describe('MariaDBUserRepository.delete', () => {
    beforeEach(() => vi.clearAllMocks());

    it('devuelve true cuando MariaDB elimina una fila', async () => {
        mocks.query.mockResolvedValue([{ affectedRows: 1 }]);

        await expect(new MariaDBUserRepository().delete('user-id')).resolves.toBe(true);
        expect(mocks.query).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?', ['user-id']);
    });

    it('devuelve false cuando no existe una fila con ese UUID', async () => {
        mocks.query.mockResolvedValue([{ affectedRows: 0 }]);

        await expect(new MariaDBUserRepository().delete('missing-id')).resolves.toBe(false);
    });

    it('propaga los errores de MariaDB', async () => {
        const databaseError = new Error('database unavailable');
        mocks.query.mockRejectedValue(databaseError);

        await expect(new MariaDBUserRepository().delete('user-id')).rejects.toBe(databaseError);
    });
});
