import { JSONFilePreset } from 'lowdb/node';
import type { Low } from 'lowdb';
import type { User } from '../schemas/UserSchema.js';
import type { ContainerImage } from '../schemas/ContainerImageSchema.js';
import type { Workspace } from '../schemas/WorkspaceSchema.js';

type DatabaseData = {
    users: User[];
    containerImages: ContainerImage[];
    workspaces: Workspace[];
};

export const db: Low<DatabaseData> = await JSONFilePreset<DatabaseData>('db.json', {
    users: [],
    containerImages: [],
    workspaces: [],
});

if (!Array.isArray(db.data.workspaces)) {
    db.data.workspaces = [];
    await db.write();
}
