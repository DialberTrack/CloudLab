import type { User } from '../schemas/user.schema.js';
import { MariaDBUserRepository } from './mariadb/user.repository.js';

export interface UserRepository {
    findById(id: string): Promise<User | null>;
    getById(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    create(user: User): Promise<User>;
    update(id: string, user: Partial<User>): Promise<User | null>;
    delete(id: string): Promise<boolean>;
    setRefreshToken(id: string, refreshToken: string): Promise<void>;
}

export const UserRepository = new MariaDBUserRepository();
