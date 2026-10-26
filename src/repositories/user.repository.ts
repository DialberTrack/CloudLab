import type { User } from '../schemas/user.schema.js';
import { MariaDBUserRepository } from './mariadb/user.repository.js';
import type { ListQuery, Pagination } from '../utils/list.utils.js';

export interface UserList {
    data: Omit<User, 'password'>[];
    pagination: Pagination;
}

export interface UserRepository {
    findById(id: string): Promise<User | null>;
    getById(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    list(query: ListQuery): Promise<UserList>;
    create(user: User): Promise<User>;
    update(id: string, user: Partial<User>): Promise<User | null>;
    delete(id: string): Promise<boolean>;
}

export const UserRepository = new MariaDBUserRepository();
