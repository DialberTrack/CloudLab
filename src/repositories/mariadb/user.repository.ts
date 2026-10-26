import type { RowDataPacket } from 'mysql2/promise';
import pool from '../../config/mariadb.config.js';
import type { User } from '../../schemas/user.schema.js';
import type { UserList, UserRepository } from '../user.repository.js';
import { UserNotFoundError } from '../../errors/user.error.js';
import { ListUtils, type ListQuery } from '../../utils/list.utils.js';

type UserRow = User & RowDataPacket;

export class MariaDBUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);

        return rows[0] || null;
    }

    async getById(id: string): Promise<User> {
        const user = await this.findById(id);
        if (!user) {
            throw new UserNotFoundError();
        }

        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ?', [email]);

        return rows[0] || null;
    }

    async update(id: string, user: Partial<User>): Promise<User | null> {
        if (Object.keys(user).length === 0) {
            return this.findById(id);
        }

        await pool.query('UPDATE users SET ? WHERE id = ?', [user, id]);
        return this.findById(id);
    }

    async list({ page, limit, q }: ListQuery): Promise<UserList> {
        const searchCondition = q ? ' WHERE name LIKE ? OR email LIKE ?' : '';
        const searchParams = q ? [`%${q}%`, `%${q}%`] : [];

        const [[countRows], [rows]] = await Promise.all([
            pool.query<Array<{ total: number } & RowDataPacket>>(
                `
                SELECT COUNT(*) AS total
                FROM users${searchCondition}
                `,
                searchParams
            ),
            pool.query<UserRow[]>(
                `
                SELECT id, name, email, role, is_active, created_at, updated_at 
                    FROM users${searchCondition} 
                    ORDER BY name 
                    LIMIT ? 
                    OFFSET ?
                `,
                [...searchParams, limit, ListUtils.getOffset({ page, limit })]
            ),
        ]);

        const total = Number(countRows[0]?.total ?? 0);

        return {
            data: rows,
            pagination: ListUtils.pagination({ page, limit }, total),
        };
    }

    create(user: User): Promise<User> {
        throw new Error('Method not implemented.');
    }

    delete(id: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
}
