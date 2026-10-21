import { JSONFilePreset } from "lowdb/node";
import type { User } from "../../schemas/UserSchema.js";
import type { ListUsersOptions, UserListItem, UserRepositoryContract } from "../../types/UserRepository.types.js";
import { ListUtils, type PaginationResult } from "../../utils/ListUtils.js";

type Data = {
    users: User[];
}

const db = await JSONFilePreset<Data>('db.json', { users: [] });

export class LowdbUserRepository implements UserRepositoryContract {
    async findByEmail(email: string): Promise<User | undefined> {
        return db.data.users.find(user => user.email === email);
    }

    async findById(id: string): Promise<User | undefined> {
        return db.data.users.find(user => user.id === id);
    }

    async create(user: User): Promise<User> {
        db.data.users.push(user);
        await db.write();
        return user;
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
        return Promise.reject(new Error('Usuario no encontrado'));
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
}