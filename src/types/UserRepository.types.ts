import type { EditUser, User } from '../schemas/UserSchema.js';
import type { PaginationResult } from '../utils/ListUtils.js';

export interface ListUsersOptions {
    page?: unknown;
    limit?: unknown;
    q?: unknown;
}

export type UserListItem = Omit<User, 'password' | 'refreshToken'>;

export interface UserRepositoryContract {
    findByEmail(email: string): Promise<User | undefined>;
    findById(id: string): Promise<User | undefined>;
    getById(id: string): Promise<User>;
    create(user: User): Promise<User>;
    updateRefreshToken(id: string, refreshToken: string): Promise<void>;
    updatePassword(id: string, newPassword: string): Promise<void>;
    listUsers(options?: ListUsersOptions): Promise<PaginationResult<UserListItem>>;
    updateUser(id: string, updates: EditUser): Promise<void>;
    deleteUser(id: string): Promise<void>;
    resetUserPassword(id: string, newPassword: string): Promise<void>;
}
