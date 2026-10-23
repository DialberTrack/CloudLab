import type { Workspace } from '../schemas/WorkspaceSchema.js';

export type WorkspaceList = {
    own: Workspace[];
    all?: Workspace[];
};

export interface WorkspaceRepositoryContract {
    list(userId: string, isAdmin: boolean): Promise<Workspace[]>;
    create(workspace: Workspace): Promise<Workspace>;
    getById(id: string): Promise<Workspace>;
    delete(id: string): Promise<void>;
}
