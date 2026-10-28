import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../../config/mariadb.config.js';
import { WorkspaceNotFoundError } from '../../errors/workspace.error.js';
import type { Workspace } from '../../schemas/workspaces.schema.js';
import { ListUtils, type ListQuery } from '../../utils/list.utils.js';
import type {
    CreateWorkspaceRecord,
    WorkspaceList,
    WorkspaceRepository,
} from '../workspace.repository.js';

type WorkspaceRow = Workspace & RowDataPacket;

export class MariaDBWorkspaceRepository implements WorkspaceRepository {
    async listByUser(userId: string, { limit, page, q }: ListQuery): Promise<WorkspaceList> {
        const whereConditions = ['w.user_id = ?'];
        const searchParams: unknown[] = [userId];

        if (q) {
            whereConditions.push('(w.name LIKE ? OR w.status LIKE ?)');
            searchParams.push(`%${q}%`, `%${q}%`);
        }

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        const offset = ListUtils.getOffset({ page, limit });

        const [countResult, workspacesResult] = await Promise.all([
            pool.query<Array<{ total: number } & RowDataPacket>>(
                `
            SELECT COUNT(*) AS total
            FROM workspaces AS w
            ${whereClause}
            `,
                searchParams
            ),
            pool.query<WorkspaceRow[]>(
                `
            SELECT
                w.id,
                w.name,
                w.status,
                w.created_at,
                w.updated_at,
                ci.name AS image_name,
                ci.image AS image
            FROM workspaces AS w
            INNER JOIN container_images AS ci
                ON w.container_image_id = ci.id
            ${whereClause}
            ORDER BY w.created_at DESC, w.id DESC
            LIMIT ?
            OFFSET ?
            `,
                [...searchParams, limit, offset]
            ),
        ]);

        const total = countResult[0][0]?.total ?? 0;

        return {
            data: workspacesResult[0],
            pagination: ListUtils.pagination({ page, limit }, total),
        };
    }

    async listAll({ limit, page, q }: ListQuery): Promise<WorkspaceList> {
        const whereConditions: string[] = [];
        const searchParams: unknown[] = [];

        if (q) {
            whereConditions.push('(w.name LIKE ? OR w.status LIKE ? OR ci.name LIKE ?)');
            searchParams.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const offset = ListUtils.getOffset({ page, limit });

        const [countResult, workspacesResult] = await Promise.all([
            pool.query<Array<{ total: number } & RowDataPacket>>(
                `
            SELECT COUNT(*) AS total
            FROM workspaces AS w
            INNER JOIN container_images AS ci
                ON w.container_image_id = ci.id
            ${whereClause}
            `,
                searchParams
            ),
            pool.query<WorkspaceRow[]>(
                `
            SELECT
                w.id,
                w.user_id,
                w.name,
                w.status,
                w.created_at,
                w.updated_at,
                ci.id AS image_id,
                ci.name AS image_name,
                ci.image AS image
            FROM workspaces AS w
            INNER JOIN container_images AS ci
                ON w.container_image_id = ci.id
            ${whereClause}
            ORDER BY w.created_at DESC, w.id DESC
            LIMIT ?
            OFFSET ?
            `,
                [...searchParams, limit, offset]
            ),
        ]);

        const total = countResult[0][0]?.total ?? 0;

        return {
            data: workspacesResult[0],
            pagination: ListUtils.pagination({ page, limit }, total),
        };
    }

    async create(workspace: CreateWorkspaceRecord): Promise<Workspace> {
        await pool.query<ResultSetHeader>('INSERT INTO workspaces SET ?', [workspace]);

        return this.getById(workspace.id);
    }

    async findById(id: string): Promise<Workspace | null> {
        const [rows] = await pool.query<WorkspaceRow[]>(
            `
            SELECT
                w.id,
                w.name,
                w.status,
                w.created_at,
                ci.name AS image_name,
                ci.image AS image
            FROM workspaces AS w
            INNER JOIN container_images AS ci
                ON w.container_image_id = ci.id
            WHERE w.id = ?
            `,
            [id]
        );

        return rows[0] ?? null;
    }

    async getById(id: string): Promise<Workspace> {
        const workspace = await this.findById(id);

        if (workspace) {
            return workspace;
        }

        throw new WorkspaceNotFoundError();
    }

    async delete(id: string): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>('DELETE FROM workspaces WHERE id = ?', [
            id,
        ]);

        return result.affectedRows > 0;
    }
}
