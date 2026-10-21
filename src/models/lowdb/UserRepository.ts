import { JSONFilePreset } from "lowdb/node";
import type { User } from "../../schemas/UserSchema.js";

type Data = {
    users: User[];
}

const db = await JSONFilePreset<Data>('db.json', { users: [] });

export class UserRepository {
    static async findByEmail(email: string): Promise<User | undefined> {
        return db.data.users.find(user => user.email === email);
    }

    static async findById(id: string): Promise<User | undefined> {
        return db.data.users.find(user => user.id === id);
    }

    static async create(user: User): Promise<User> {
        db.data.users.push(user);
        await db.write();
        return user;
    }

    static async updateRefreshToken(id: string, refreshToken: string): Promise<void> {
        const user = db.data.users.find(user => user.id === id);
        if (user) {
            user.refreshToken = refreshToken;
            await db.write();
        }
    }

    static async updatePassword(id: string, newPassword: string): Promise<void> {
        const user = db.data.users.find(user => user.id === id);
        if (user) {
            user.password = newPassword;
            await db.write();
            return;
        }
        return Promise.reject(new Error('Usuario no encontrado'));
    }
}