import type { RequestHandler } from 'express';
import { WorkspaceRepository } from '../repositories/WorkspaceRepository.js';
import { CreateWorkspaceSchema } from '../schemas/WorkspaceSchema.js';
import { ContainerImageRepository } from '../repositories/ContainerImageRepository.js';
import crypto from 'crypto';
import { DockerService } from '../services/DockerService.js';
import { getFreePort } from '../utils/Utils.js';

export class WorkspaceController {
    public static list: RequestHandler = async (req, res) => {
        const user = req.user!;
        const isAdmin = user.role === 'admin';

        const [ownWorkspaces, allWorkspaces] = await Promise.all([
            WorkspaceRepository.listByUserId(user.id),
            isAdmin ? WorkspaceRepository.listAll() : Promise.resolve(null),
        ]);

        if (isAdmin) {
            return res.json({ own: ownWorkspaces, all: allWorkspaces });
        }

        return res.json({ own: ownWorkspaces });
    };

    public static create: RequestHandler = async (req, res) => {
        const result = CreateWorkspaceSchema.safeParse(req.body ?? {});

        if (!result.success) {
            return res.status(400).json({
                errors: result.error.issues,
            });
        }

        const { catalog_id } = result.data;
        const containerImage = await ContainerImageRepository.getById(catalog_id);

        const id = crypto.randomUUID();
        const freePort = await getFreePort();
        const vncPassword = crypto.randomBytes(8).toString('hex');

        try {
            const container = await DockerService.createContainer({
                name: `workspace-${id}`,
                imageReference: containerImage.imageReference,
                hostPort: freePort,
                vncPassword,
            });

            const workspace = await WorkspaceRepository.create({
                id,
                user_id: req.user!.id,
                catalog_id: containerImage.id,
                container_id: container.id,
                port: freePort,
                status: 'created',
                created_at: new Date().toISOString(),
                vnc_password: vncPassword,
            });

            await DockerService.startContainer(container.id);
            await WorkspaceRepository.updateStatus(workspace.id, 'running');

            return res.status(201).json({ message: 'Maquina lista', workspace });
        } catch (error) {
            console.error('Error creating container:', error);
        }
    };
}
