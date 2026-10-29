import type {
    CreateWorkspaceInput,
    Workspace,
    WorkspaceUpdateInput,
} from '../schemas/workspaces.schema.js';
import type { ListQuery, Pagination } from '../utils/list.utils.js';
import { MariaDBWorkspaceRepository } from './mariadb/workspace.repository.js';

export interface WorkspaceList {
    data: WorkspaceListItem[];
    pagination: Pagination;
}

export type WorkspaceListItem = Pick<
    Workspace,
    'id' | 'name' | 'status' | 'created_at' | 'updated_at'
> & {
    user_id?: string;
    image_id?: string;
    image_name: string;
    image: string;
};

export type WorkspaceDetails = Pick<
    Workspace,
    'id' | 'name' | 'status' | 'container_id' | 'created_at'
> & {
    image_name: string;
    image: string;
};

export type CreateWorkspacePersistence = CreateWorkspaceInput & {
    id: string;
    user_id: string;
    status: Workspace['status'];
};

export interface WorkspaceRepository {
    listByUser(userId: string, query: ListQuery): Promise<WorkspaceList>;
    listAll(query: ListQuery): Promise<WorkspaceList>;
    create(workspace: CreateWorkspacePersistence): Promise<WorkspaceDetails>;
    findById(id: string, ownerId?: string): Promise<WorkspaceDetails | null>;
    getById(id: string, ownerId?: string): Promise<WorkspaceDetails>;
    update(id: string, updates: WorkspaceUpdateInput): Promise<WorkspaceDetails>;
    delete(id: string, ownerId?: string): Promise<boolean>;
}

export const WorkspaceRepository = new MariaDBWorkspaceRepository();
