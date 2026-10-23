import { db } from '../../config/database.js';
import { WorkspaceNotFoundError } from '../../errors/WorkspaceError.js';
import type { Workspace } from '../../schemas/WorkspaceSchema.js';
import type { WorkspaceList } from '../../types/WorkspaceRepository.types.js';

export class LowdbWorkspaceRepository {
    private sanitize(workspace: Workspace): Omit<Workspace, 'vnc_password'> {
        const { vnc_password: _password, ...rest } = workspace;
        return rest;
    }

    async listAll(): Promise<Omit<Workspace, 'vnc_password'>[]> {
        return db.data.workspaces.map(this.sanitize);
    }

    async listByUserId(userId: string): Promise<Omit<Workspace, 'vnc_password'>[]> {
        return db.data.workspaces
            .filter((workspace) => workspace.user_id === userId)
            .map(this.sanitize);
    }

    async create(workspace: Workspace): Promise<Omit<Workspace, 'vnc_password'>> {
        db.data.workspaces.push(workspace);
        await db.write();
        return this.sanitize(workspace);
    }

    async findById(id: string): Promise<Workspace | undefined> {
        return db.data.workspaces.find((workspace) => workspace.id === id);
    }

    async getById(id: string): Promise<Workspace> {
        const workspace = await this.findById(id);
        if (!workspace) {
            throw new WorkspaceNotFoundError();
        }
        return workspace;
    }

    async delete(id: string): Promise<void> {
        const workspaceIndex = db.data.workspaces.findIndex((workspace) => workspace.id === id);
        if (workspaceIndex === -1) {
            throw new WorkspaceNotFoundError();
        }

        db.data.workspaces.splice(workspaceIndex, 1);
        await db.write();
    }

    async updateStatus(id: string, status: Workspace['status']): Promise<void> {
        const workspace = await this.getById(id);
        workspace.status = status;
        await db.write();
    }
}
