import { db } from '../../config/database.js';
import type { EditUser, User } from '../../schemas/UserSchema.js';
import type { ListUsersOptions, UserListItem, UserRepositoryContract } from '../UserRepository.js';
import { ListUtils, type PaginationResult } from '../../utils/ListUtils.js';
import { UserEmailAlreadyExistsError, UserNotFoundError } from '../../errors/UserErrors.js';

export class LowdbUserRepository implements UserRepositoryContract {
    async findByEmail(email: string): Promise<User | undefined> {
        const normalizedEmail = email.trim().toLowerCase();
        return db.data.users.find((user) => user.email.toLowerCase() === normalizedEmail);
    }

    async findById(id: string): Promise<User | undefined> {
        return db.data.users.find((user) => user.id === id);
    }

    async getById(id: string): Promise<User> {
        const user = await this.findById(id);
        if (!user) {
            throw new UserNotFoundError();
        }
        return user;
    }

    async create(user: User): Promise<User> {
        const normalizedEmail = user.email.trim().toLowerCase();
        if (db.data.users.some((existing) => existing.email.toLowerCase() === normalizedEmail)) {
            throw new UserEmailAlreadyExistsError();
        }

        const normalizedUser = { ...user, email: normalizedEmail };
        db.data.users.push(normalizedUser);
        await db.write();
        return normalizedUser;
    }

    async updateRefreshToken(id: string, refreshToken: string): Promise<void> {
        const user = db.data.users.find((user) => user.id === id);
        if (user) {
            user.refreshToken = refreshToken;
            await db.write();
        }
    }

    async updatePassword(id: string, newPassword: string): Promise<void> {
        const user = db.data.users.find((user) => user.id === id);
        if (user) {
            user.password = newPassword;
            await db.write();
            return;
        }
        throw new UserNotFoundError();
    }

    async list(options: ListUsersOptions = {}): Promise<PaginationResult<UserListItem>> {
        const params = ListUtils.getPaginationParams(options.page, options.limit);
        const query = typeof options.q === 'string' ? options.q.trim().toLocaleLowerCase() : '';
        const result = ListUtils.paginateAndFilter(db.data.users, params, (user) => {
            return (
                !query ||
                user.name.toLocaleLowerCase().includes(query) ||
                user.email.toLocaleLowerCase().includes(query)
            );
        });

        return {
            ...result,
            data: result.data.map(({ password, refreshToken, ...user }) => user),
        };
    }

    async update(id: string, updates: EditUser): Promise<void> {
        const user = db.data.users.find((user) => user.id === id);
        if (!user) {
            throw new UserNotFoundError();
        }

        if (updates.email !== undefined) {
            this.ensureUniqueReference(updates.email, id);
            user.email = updates.email;
        }
        if (updates.name !== undefined) {
            user.name = updates.name;
        }
        if (updates.role !== undefined) {
            user.role = updates.role;
        }
        if (updates.active !== undefined) {
            user.active = updates.active;
            if (!updates.active) {
                user.refreshToken = '';
            }
        }
        await db.write();
    }

    async delete(id: string): Promise<void> {
        const userIndex = db.data.users.findIndex((user) => user.id === id);
        if (userIndex === -1) {
            throw new UserNotFoundError();
        }

        db.data.users.splice(userIndex, 1);
        await db.write();
    }

    async resetPassword(id: string, newPassword: string): Promise<void> {
        const user = db.data.users.find((user) => user.id === id);
        if (!user) {
            throw new UserNotFoundError();
        }
        user.password = newPassword;
        await db.write();
    }

    private ensureUniqueReference(reference: string, excludeId?: string): void {
        const normalizedReference = reference.toLowerCase();
        const duplicate = db.data.users.some(
            (user) => user.id !== excludeId && user.email.toLowerCase() === normalizedReference
        );

        if (duplicate) {
            throw new UserEmailAlreadyExistsError();
        }
    }
}
