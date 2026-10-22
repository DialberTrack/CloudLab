import type { Workspace } from '../schemas/WorkspaceSchema.js';

export interface WorkspaceRepositoryContract {
    create(workspace: Workspace): Promise<Workspace>;
    listByUserId(userId: string): Promise<Workspace[]>;
    listAll(): Promise<Workspace[]>;
}
