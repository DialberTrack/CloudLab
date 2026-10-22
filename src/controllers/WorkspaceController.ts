import type { RequestHandler } from 'express';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { CreateWorkspaceSchema } from '../schemas/WorkspaceSchema.js';

export class WorkspaceController {
    constructor(private readonly workspaceService: WorkspaceService) {}

    public list: RequestHandler = async (req, res) => {
        const user = req.user;
        const workspaces = await this.workspaceService.list(user!.id, user!.role === 'admin');

        return res.json(workspaces);
    };

    public create: RequestHandler = async (req, res) => {
        const user = req.user;
        const result = CreateWorkspaceSchema.safeParse(req.body ?? {});
        if (!result.success) {
            return res.status(400).json({ errors: result.error.issues });
        }

        const workspace = await this.workspaceService.create(user!.id, result.data);
        return res.status(201).json({ workspace });
    };
}
