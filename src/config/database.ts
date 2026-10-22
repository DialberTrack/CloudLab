import { JSONFilePreset } from 'lowdb/node';
import type { Low } from 'lowdb';
import type { User } from '../schemas/UserSchema.js';
import type { ContainerImage } from '../schemas/ContainerImageSchema.js';

type DatabaseData = {
    users: User[];
    containerImages: ContainerImage[];
};

export const db: Low<DatabaseData> = await JSONFilePreset<DatabaseData>('db.json', {
    users: [],
    containerImages: [],
});
