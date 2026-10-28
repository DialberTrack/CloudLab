import type { RequestHandler } from 'express';
import { ValidationError } from '../errors/app.error.js';
import { WorkspaceDeletionError } from '../errors/workspace.error.js';
import { ContainerImageRepository } from '../repositories/container-image.repository.js';
import { WorkspaceRepository } from '../repositories/workspace.repository.js';
import { CreateWorkspaceSchema, WorkspaceIdSchema } from '../schemas/workspaces.schema.js';
import { authed } from '../types/auth-request.js';
import { ListUtils } from '../utils/list.utils.js';

export class WorkspaceController {
    /** GET /api/workspaces. Lista los workspaces disponibles para el usuario. */
    static list: RequestHandler = authed(async (req, res) => {
        const query = ListUtils.parseQuery(req.query);
        const workspaces = await WorkspaceRepository.listByUser(req.user.id, query);
        res.json(workspaces);
    });

    /** GET /api/admin/workspaces. Lista todos los workspaces. */
    static listAll: RequestHandler = authed(async (req, res) => {
        const query = ListUtils.parseQuery(req.query);
        const workspaces = await WorkspaceRepository.listAll(query);
        res.json(workspaces);
    });

    /** POST /api/workspaces. Crea un workspace con los datos recibidos. */
    static create: RequestHandler = authed(async (req, res) => {
        const validation = CreateWorkspaceSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { image } = await ContainerImageRepository.getById(
            validation.data.container_image_id
        );

        const workspace = await WorkspaceRepository.create({
            ...validation.data,
            id: crypto.randomUUID(),
            user_id: req.user.id,
            status: 'creating',
        });

        res.status(201).json(workspace);
    });

    /** GET /api/workspaces/:id. Obtiene un workspace por su identificador. */
    static get: RequestHandler = async (req, res) => {
        const validation = WorkspaceIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { id } = validation.data;
        const workspace = await WorkspaceRepository.getById(id);

        res.json(workspace);
    };

    /** DELETE /api/workspaces/:id. Elimina un workspace existente. */
    static delete: RequestHandler = async (req, res) => {
        const validation = WorkspaceIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { id } = validation.data;

        const deleted = await WorkspaceRepository.delete(id);
        if (!deleted) {
            throw new WorkspaceDeletionError();
        }

        res.send({ message: 'Workspace eliminado correctamente' });
    };

    /** POST /api/workspaces/:id/start. Inicia los recursos del workspace. */
    static start: RequestHandler = async (req, res) => {
        // Lógica para iniciar un workspace
    };

    /** POST /api/workspaces/:id/stop. Detiene los recursos del workspace. */
    static stop: RequestHandler = async (req, res) => {
        // Lógica para detener un workspace
    };

    /** POST /api/workspaces/:id/restart. Reinicia los recursos del workspace. */
    static restart: RequestHandler = async (req, res) => {
        // Lógica para reiniciar un workspace
    };

    /** GET /api/workspaces/:id/metrics. Consulta las métricas del workspace. */
    static metrics: RequestHandler = async (req, res) => {
        // Lógica para consultar métricas de un workspace
    };
}
