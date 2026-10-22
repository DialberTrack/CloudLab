import type {
    Container,
} from '../types/Container.types.js';
import type { WorkspaceRepositoryContract } from '../types/WorkspaceRepository.types.js';
import type {
    CreateWorkspace,
    Workspace,
    WorkspaceListItem,
} from '../schemas/WorkspaceSchema.js';
import type { ContainerImageRepositoryContract } from '../types/ContainerImageRepository.types.js';
import type { DockerContainerService } from '../docker/DockerContainerService.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { reserveWorkspacePort } from '../utils/WorkspacePortAllocator.js';

export type WorkspaceList =
    | { own: WorkspaceListItem[]; all: WorkspaceListItem[] }
    | { own: WorkspaceListItem[] };

export class WorkspaceService {
    constructor(
        private readonly docker: Pick<
            DockerContainerService,
            'create' | 'get' | 'start' | 'stop' | 'restart' | 'remove'
        >,
        private readonly workspaceRepository: WorkspaceRepositoryContract,
        private readonly containerImageRepository: Pick<ContainerImageRepositoryContract, 'getById'>,
    ) {}

    async create(userId: string, input: CreateWorkspace): Promise<WorkspaceListItem> {
        const catalogImage = await this.containerImageRepository.getById(input.catalog_id);
        const existingWorkspaces = await this.workspaceRepository.listAll();
        const portReservation = await reserveWorkspacePort(
            existingWorkspaces.map((workspace) => workspace.port),
        );
        const id = randomUUID();
        const vncPassword = randomBytes(18).toString('base64url');
        let container: Container | undefined;

        try {
            container = await this.docker.create({
                name: `workspace-${id}`,
                imageReference: catalogImage.imageReference,
                hostPort: portReservation.port,
                vncPassword,
            });

            const workspace: Workspace = {
                id,
                user_id: userId,
                catalog_id: catalogImage.id,
                container_id: container.id,
                port: portReservation.port,
                status: container.status,
                created_at: new Date().toISOString(),
                vnc_password: vncPassword,
            };

            await this.workspaceRepository.create(workspace);
            const { vnc_password: _password, ...workspaceResponse } = workspace;
            return workspaceResponse;
        } catch (error) {
            if (container) {
                try {
                    await this.docker.remove(container.id);
                } catch (cleanupError) {
                    throw new AggregateError(
                        [error, cleanupError],
                        'Falló la creación del workspace y no se pudo limpiar el contenedor.',
                    );
                }
            }
            throw error;
        } finally {
            portReservation.release();
        }
    }

    async list(ownerId: string, isAdmin: boolean): Promise<WorkspaceList> {
        const [ownedWorkspaces, allWorkspaces] = await Promise.all([
            this.workspaceRepository.listByUserId(ownerId),
            isAdmin ? this.workspaceRepository.listAll() : Promise.resolve(undefined),
        ]);
        const own = ownedWorkspaces.map(({ vnc_password: _password, ...workspace }) => workspace);

        if (isAdmin) {
            const all = (allWorkspaces ?? []).map(({ vnc_password: _password, ...workspace }) => workspace);
            return { own, all };
        }

        return { own };
    }

    get(id: string): Promise<Container> {
        return this.docker.get(id);
    }

    start(id: string): Promise<void> {
        return this.docker.start(id);
    }

    stop(id: string): Promise<void> {
        return this.docker.stop(id);
    }

    restart(id: string): Promise<void> {
        return this.docker.restart(id);
    }

    remove(id: string): Promise<void> {
        return this.docker.remove(id);
    }
}
