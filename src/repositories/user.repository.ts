import type { CreateUserInput, User } from '../schemas/user.schema.js';
import type { ListQuery, Pagination } from '../utils/list.utils.js';
import { MariaDBUserRepository } from './mariadb/user.repository.js';

export interface UserList {
    data: Omit<User, 'password'>[];
    pagination: Pagination;
}

export interface UserRepository {
    findById(id: string): Promise<User | null>;
    getById(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    getByEmail(email: string): Promise<User>;
    update(id: string, user: Partial<User>): Promise<User | null>;
    list({ page, limit, q }: ListQuery): Promise<UserList>;
    create(user: CreateUserInput): Promise<User>;
    delete(id: string): Promise<boolean>;
}

export const UserRepository = new MariaDBUserRepository();
