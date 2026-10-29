import type { RequestHandler } from 'express';
import { ValidationError } from '../errors/app.error.js';
import { WorkspaceRepository } from '../repositories/workspace.repository.js';
import { CreateWorkspaceSchema, WorkspaceIdSchema } from '../schemas/workspaces.schema.js';
import { WorkspaceService } from '../services/workspace.service.js';
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

        const workspace = await WorkspaceService.create({
            ...validation.data,
            user_id: req.user.id,
        });

        res.status(201).json(workspace);
    });

    /** GET /api/workspaces/:id. Obtiene un workspace por su identificador. */
    static get: RequestHandler = authed(async (req, res) => {
        const validation = WorkspaceIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const workspace = await WorkspaceRepository.getById(validation.data.id, req.user.id);

        res.json(workspace);
    });

    /** DELETE /api/workspaces/:id. Elimina un workspace existente. */
    static delete: RequestHandler = authed(async (req, res) => {
        const validation = WorkspaceIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        await WorkspaceService.delete(validation.data.id, req.user.id);

        res.send({ message: 'Workspace eliminado correctamente' });
    });

    /** POST /api/workspaces/:id/start. Inicia los recursos del workspace. */
    static start: RequestHandler = authed(async (req, res) => {
        const validation = WorkspaceIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const workspace = await WorkspaceService.start(validation.data.id, req.user.id);
        res.json(workspace);
    });

    /** POST /api/workspaces/:id/stop. Detiene los recursos del workspace. */
    static stop: RequestHandler = authed(async (req, res) => {
        const validation = WorkspaceIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const workspace = await WorkspaceService.stop(validation.data.id, req.user.id);
        res.json(workspace);
    });

    /** POST /api/workspaces/:id/restart. Reinicia los recursos del workspace. */
    static restart: RequestHandler = authed(async (req, res) => {
        const validation = WorkspaceIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const workspace = await WorkspaceService.restart(validation.data.id, req.user.id);
        res.json(workspace);
    });

    /** GET /api/workspaces/:id/metrics. Consulta las métricas del workspace. */
    static metrics: RequestHandler = authed(async (req, res) => {
        const validation = WorkspaceIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const metrics = await WorkspaceService.metrics(validation.data.id, req.user.id);
        res.json({ data: metrics });
    });
}
