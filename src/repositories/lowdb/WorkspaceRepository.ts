import { db } from '../../config/database.js';
import type { Workspace } from '../../schemas/WorkspaceSchema.js';
import type { WorkspaceRepositoryContract } from '../WorkspaceRepository.js';

export class LowdbWorkspaceRepository implements WorkspaceRepositoryContract {
    async create(workspace: Workspace): Promise<Workspace> {
        db.data.workspaces.push(workspace);
        try {
            await db.write();
        } catch (error) {
            const workspaceIndex = db.data.workspaces.findIndex(
                (candidate) => candidate.id === workspace.id,
            );
            if (workspaceIndex !== -1) {
                db.data.workspaces.splice(workspaceIndex, 1);
            }
            throw error;
        }
        return workspace;
    }

    async listByUserId(userId: string): Promise<Workspace[]> {
        return db.data.workspaces.filter((workspace) => workspace.user_id === userId);
    }

    async listAll(): Promise<Workspace[]> {
        return db.data.workspaces;
    }
}
