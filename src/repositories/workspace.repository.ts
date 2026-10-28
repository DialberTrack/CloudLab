import type { CreateWorkspaceInput, Workspace } from '../schemas/workspaces.schema.js';
import type { Pagination } from '../utils/list.utils.js';
import { MariaDBWorkspaceRepository } from './mariadb/workspace.repository.js';

export interface WorkspaceList {
    data: Workspace[];
    pagination: Pagination;
}

export type CreateWorkspaceRecord = CreateWorkspaceInput & {
    id: string;
    user_id: string;
    status: Workspace['status'];
};

export interface WorkspaceRepository {}

export const WorkspaceRepository = new MariaDBWorkspaceRepository();
