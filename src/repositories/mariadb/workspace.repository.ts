import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../../config/mariadb.config.js';
import { WorkspaceNotFoundError } from '../../errors/workspace.error.js';
import type { WorkspaceUpdateInput } from '../../schemas/workspaces.schema.js';
import { ListUtils, type ListQuery } from '../../utils/list.utils.js';
import type {
    CreateWorkspacePersistence,
    WorkspaceDetails,
    WorkspaceList,
    WorkspaceListItem,
    WorkspaceRepository,
} from '../workspace.repository.js';

type WorkspaceListRow = WorkspaceListItem & RowDataPacket;
type WorkspaceDetailsRow = WorkspaceDetails & RowDataPacket;
type WorkspaceCountRow = { total: number } & RowDataPacket;

export class MariaDBWorkspaceRepository implements WorkspaceRepository {
    /** Lista los workspaces pertenecientes a un usuario. */
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
            pool.query<WorkspaceCountRow[]>(
                `
            SELECT COUNT(*) AS total
            FROM workspaces AS w
            ${whereClause}
            `,
                searchParams
            ),
            pool.query<WorkspaceListRow[]>(
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

    /** Lista todos los workspaces con paginacion y filtro opcional. */
    async listAll({ limit, page, q, user_id }: ListQuery): Promise<WorkspaceList> {
        const whereConditions: string[] = user_id ? ['w.user_id = ?'] : [];
        const searchParams: unknown[] = user_id ? [user_id] : [];

        if (q) {
            whereConditions.push('(w.name LIKE ? OR w.status LIKE ? OR ci.name LIKE ?)');
            searchParams.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const offset = ListUtils.getOffset({ page, limit });

        const [countResult, workspacesResult] = await Promise.all([
            pool.query<WorkspaceCountRow[]>(
                `
            SELECT COUNT(*) AS total
            FROM workspaces AS w
            INNER JOIN container_images AS ci
                ON w.container_image_id = ci.id
            ${whereClause}
            `,
                searchParams
            ),
            pool.query<WorkspaceListRow[]>(
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

    /** Crea un workspace y devuelve sus datos persistidos. */
    async create(workspace: CreateWorkspacePersistence): Promise<WorkspaceDetails> {
        await pool.query<ResultSetHeader>('INSERT INTO workspaces SET ?', [workspace]);

        return this.getById(workspace.id);
    }

    /** Busca un workspace por ID y propietario opcional. */
    async findById(id: string, ownerId?: string): Promise<WorkspaceDetails | null> {
        const ownerCondition = ownerId ? 'AND w.user_id = ?' : '';
        const params = ownerId ? [id, ownerId] : [id];
        const [rows] = await pool.query<WorkspaceDetailsRow[]>(
            `
            SELECT
                w.id,
                w.name,
                w.status,
                w.container_id,
                w.created_at,
                w.error_message,
                ci.name AS image_name,
                ci.image AS image
            FROM workspaces AS w
            INNER JOIN container_images AS ci
                ON w.container_image_id = ci.id
            WHERE w.id = ? ${ownerCondition}
            `,
            params
        );

        return rows[0] ?? null;
    }

    /** Obtiene un workspace por ID y lanza error si no existe. */
    async getById(id: string, ownerId?: string): Promise<WorkspaceDetails> {
        const workspace = await this.findById(id, ownerId);

        if (workspace) {
            return workspace;
        }

        throw new WorkspaceNotFoundError();
    }

    /** Elimina un workspace por ID y propietario opcional. */
    async delete(id: string, ownerId?: string): Promise<boolean> {
        const ownerCondition = ownerId ? 'AND user_id = ?' : '';
        const params = ownerId ? [id, ownerId] : [id];
        const [result] = await pool.query<ResultSetHeader>(
            `DELETE FROM workspaces
            WHERE id = ? ${ownerCondition}`,
            params
        );

        return result.affectedRows > 0;
    }

    /** Actualiza un workspace y devuelve sus datos persistidos. */
    async update(id: string, updates: WorkspaceUpdateInput): Promise<WorkspaceDetails> {
        if (Object.keys(updates).length > 0) {
            await pool.query<ResultSetHeader>('UPDATE workspaces SET ? WHERE id = ?', [
                updates,
                id,
            ]);
        }

        return this.getById(id);
    }
}
