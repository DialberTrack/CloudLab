import { JSONFilePreset } from "lowdb/node";
import type { EditUser, User } from "../../schemas/UserSchema.js";
import type { ListUsersOptions, UserListItem, UserRepositoryContract } from "../../types/UserRepository.types.js";
import { ListUtils, type PaginationResult } from "../../utils/ListUtils.js";
import { UserEmailAlreadyExistsError, UserNotFoundError } from "../UserRepositoryErrors.js";

type Data = {
    users: User[];
}

const db = await JSONFilePreset<Data>('db.json', { users: [] });
let migratedCreatedAt = false;
for (const user of db.data.users) {
    if (!user.createdAt) {
        user.createdAt = new Date().toISOString();
        migratedCreatedAt = true;
    }
}
if (migratedCreatedAt) {
    await db.write();
}

export class LowdbUserRepository implements UserRepositoryContract {
    async findByEmail(email: string): Promise<User | undefined> {
        const normalizedEmail = email.trim().toLowerCase();
        return db.data.users.find(user => user.email.toLowerCase() === normalizedEmail);
    }

    async findById(id: string): Promise<User | undefined> {
        return db.data.users.find(user => user.id === id);
    }

    async create(user: User): Promise<User> {
        const normalizedEmail = user.email.trim().toLowerCase();
        if (db.data.users.some(existing => existing.email.toLowerCase() === normalizedEmail)) {
            throw new UserEmailAlreadyExistsError();
        }

        const normalizedUser = { ...user, email: normalizedEmail };
        db.data.users.push(normalizedUser);
        await db.write();
        return normalizedUser;
    }

    async updateRefreshToken(id: string, refreshToken: string): Promise<void> {
        const user = db.data.users.find(user => user.id === id);
        if (user) {
            user.refreshToken = refreshToken;
            await db.write();
        }
    }

    async updatePassword(id: string, newPassword: string): Promise<void> {
        const user = db.data.users.find(user => user.id === id);
        if (user) {
            user.password = newPassword;
            await db.write();
            return;
        }
        throw new UserNotFoundError();
    }

    async listUsers(options: ListUsersOptions = {}): Promise<PaginationResult<UserListItem>> {
        const params = ListUtils.getPaginationParams(options.page, options.limit);
        const query = typeof options.q === "string" ? options.q.trim().toLocaleLowerCase() : "";
        const result = ListUtils.paginateAndFilter(
            db.data.users,
            params,
            (user) => !query
                || user.name.toLocaleLowerCase().includes(query)
                || user.email.toLocaleLowerCase().includes(query)
        );

        return {
            ...result,
            data: result.data.map(({ password, refreshToken, ...user }) => user)
        };
    }

    async updateUser(id: string, updates: EditUser): Promise<void> {
        const user = db.data.users.find(user => user.id === id);
        if (!user) {
            throw new UserNotFoundError();
        }

        if (updates.email !== undefined) {
            const normalizedEmail = updates.email.toLowerCase();
            const duplicateEmail = db.data.users.some(
                candidate => candidate.id !== id && candidate.email.toLowerCase() === normalizedEmail
            );
            if (duplicateEmail) {
                throw new UserEmailAlreadyExistsError();
            }
            user.email = normalizedEmail;
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
                user.refreshToken = "";
            }
        }
        await db.write();
    }
}