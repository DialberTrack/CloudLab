import type { RowDataPacket } from 'mysql2/promise';
import pool from '../../config/mariadb.config.js';
import { UserNotFoundError } from '../../errors/user.error.js';
import type { CreateUserInput, User } from '../../schemas/user.schema.js';
import { ListUtils, type ListQuery } from '../../utils/list.utils.js';
import type { UserList, UserRepository } from '../user.repository.js';

type UserRow = User & RowDataPacket;

export class MariaDBUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);

        return rows[0] ?? null;
    }

    async getById(id: string): Promise<User> {
        const user = await this.findById(id);

        if (user) {
            return user;
        }

        throw new UserNotFoundError();
    }

    async findByEmail(email: string): Promise<User | null> {
        const [users] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ?', [email]);

        return users[0] ?? null;
    }

    async getByEmail(email: string): Promise<User> {
        const user = await this.findByEmail(email);

        if (user) {
            return user;
        }

        throw new UserNotFoundError();
    }

    async update(id: string, user: Partial<User>): Promise<User | null> {
        if (Object.keys(user).length > 0) {
            await pool.query('UPDATE users SET ? WHERE id = ?', [user, id]);
        }

        return this.findById(id);
    }

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

        const total = Number(countResult[0][0]?.total ?? 0);
        const users = usersResult[0];

        return {
            data: users,
            pagination: ListUtils.pagination({ page, limit }, total),
        };
    }

    async create(user: CreateUserInput): Promise<Omit<User, 'password'>> {
        const { role, ...userData } = user;
        const dataToInsert = role === undefined ? userData : { ...userData, role };

        await pool.query('INSERT INTO users SET ?', [dataToInsert]);

        const newUser = await this.getByEmail(user.email);
        return newUser;
    }

    async delete(id: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
}
