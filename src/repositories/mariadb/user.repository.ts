import type { RowDataPacket } from 'mysql2/promise';
import pool from '../../config/mariadb.config.js';
import type { User } from '../../schemas/user.schema.js';
import type { UserRepository } from '../user.repository.js';
import { UserNotFoundError } from '../../errors/user.error.js';

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

    create(user: User): Promise<User> {
        throw new Error('Method not implemented.');
    }

    async update(id: string, user: Partial<User>): Promise<User | null> {
        if (Object.keys(user).length === 0) {
            return this.findById(id);
        }

        await pool.query('UPDATE users SET ? WHERE id = ?', [user, id]);
        return this.findById(id);
    }

    delete(id: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    async setRefreshToken(id: string, refreshToken: string): Promise<void> {
        await pool.query('UPDATE users SET refreshToken = ? WHERE id = ?', [refreshToken, id]);
    }
}
