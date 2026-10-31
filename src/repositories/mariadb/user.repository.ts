import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../../config/mariadb.config.js';
import { UserNotFoundError } from '../../errors/user.error.js';
import type {
    CreateUserInput,
    User,
    UserUpdatePersistenceInput,
} from '../../schemas/user.schema.js';
import { ListUtils, type ListQuery } from '../../utils/list.utils.js';
import type { UserList, UserRepository } from '../user.repository.js';

type UserRow = User & RowDataPacket;

export class MariaDBUserRepository implements UserRepository {
    /** Busca un usuario por UUID sin lanzar error si no existe. */
    async findById(id: string): Promise<User | null> {
        const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);

        return rows[0] ?? null;
    }

    /** Busca un usuario por UUID y lanza error si no existe. */
    async getById(id: string): Promise<User> {
        const user = await this.findById(id);

        if (user) {
            return user;
        }

        throw new UserNotFoundError();
    }

    /** Busca un usuario por correo sin lanzar error si no existe. */
    async findByEmail(email: string): Promise<User | null> {
        const [users] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ?', [email]);

        return users[0] ?? null;
    }

    /** Busca un usuario por correo y lanza error si no existe. */
    async getByEmail(email: string): Promise<User> {
        const user = await this.findByEmail(email);

        if (user) {
            return user;
        }

        throw new UserNotFoundError();
    }

    /** Actualiza las columnas indicadas y devuelve el estado persistido. */
    async update(id: string, user: UserUpdatePersistenceInput): Promise<User | null> {
        if (Object.keys(user).length > 0) {
            await pool.query('UPDATE users SET ? WHERE id = ?', [user, id]);
        }

        return this.findById(id);
    }

    /** Lista usuarios sin incluir contrasenas y calcula la paginacion. */
    async list({ page, limit, q }: ListQuery): Promise<UserList> {
        const whereClause = q ? 'WHERE name LIKE ? OR email LIKE ?' : '';
        const searchParams = q ? [`%${q}%`, `%${q}%`] : [];
        const offset = ListUtils.getOffset({ page, limit });

        const [countResult, usersResult] = await Promise.all([
            pool.query<Array<{ total: number } & RowDataPacket>>(
                `
                SELECT COUNT(*) AS total
                    FROM users
                    ${whereClause}
                `,
                searchParams
            ),
            pool.query<UserRow[]>(
                `
                SELECT id, name, email, role, is_active, created_at, updated_at 
                    FROM users
                    ${whereClause}
                    ORDER BY name 
                    LIMIT ? 
                    OFFSET ?
                `,
                [...searchParams, limit, offset]
            ),
        ]);

        const total = countResult[0][0]?.total ?? 0;
        const users = usersResult[0];

        return {
            data: users,
            pagination: ListUtils.pagination({ page, limit }, total),
        };
    }

    /** Inserta un usuario y recupera la fila creada. */
    async create(user: CreateUserInput): Promise<User> {
        await pool.query('INSERT INTO users SET ?', [user]);

        return await this.getByEmail(user.email);
    }

    /** Elimina un usuario por UUID. */
    async delete(id: string): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);

        return result.affectedRows > 0;
    }
}
