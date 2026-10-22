import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkspaceService } from '../src/services/WorkspaceService.js';
import type {
    Container,
    CreateContainerOptions,
} from '../src/types/Container.types.js';
import type { DockerContainerService } from '../src/docker/DockerContainerService.js';
import type { Workspace } from '../src/schemas/WorkspaceSchema.js';
import type { WorkspaceRepositoryContract } from '../src/types/WorkspaceRepository.types.js';

test('WorkspaceService creates and persists workspaces through Docker', async () => {
    const calls: string[] = [];
    const container: Container = {
        id: 'container-id',
        name: 'test-workspace',
        imageReference: 'node:22',
        status: 'created',
        hostPort: 30000,
    };
    const catalogImage = {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        name: 'Node',
        imageReference: 'node:22',
        createdAt: new Date().toISOString(),
    };
    const workspace: Workspace = {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        user_id: 'owner-id',
        catalog_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        container_id: 'container-id',
        port: 30000,
        status: 'running',
        created_at: new Date().toISOString(),
        vnc_password: 'private-vnc-password',
    };
    const otherWorkspace: Workspace = {
        ...workspace,
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        user_id: 'other-owner-id',
        container_id: 'other-container-id',
    };
    let receivedCreateOptions: CreateContainerOptions | undefined;
    const docker: Pick<
        DockerContainerService,
        'create' | 'get' | 'start' | 'stop' | 'restart' | 'remove'
    > = {
        async create(receivedOptions) {
            receivedCreateOptions = receivedOptions;
            calls.push('create');
            return { ...container, hostPort: receivedOptions.hostPort };
        },
        async get(id) {
            calls.push(`get:${id}`);
            return container;
        },
        async start(id) {
            calls.push(`start:${id}`);
        },
        async stop(id) {
            calls.push(`stop:${id}`);
        },
        async restart(id) {
            calls.push(`restart:${id}`);
        },
        async remove(id) {
            calls.push(`remove:${id}`);
        },
    };
    const repositoryCalls: string[] = [];
    const persistedWorkspaces: Workspace[] = [];
    const workspaceRepository: WorkspaceRepositoryContract = {
        async create(receivedWorkspace) {
            persistedWorkspaces.push(receivedWorkspace);
            repositoryCalls.push('create');
            return receivedWorkspace;
        },
        async listByUserId(userId) {
            repositoryCalls.push(`listByUserId:${userId}`);
            return userId === 'owner-id' ? [workspace] : [otherWorkspace];
        },
        async listAll() {
            repositoryCalls.push('listAll');
            return [workspace, otherWorkspace];
        },
    };
    const imageRepository = {
        async getById(id: string) {
            assert.equal(id, catalogImage.id);
            return catalogImage;
        },
    };
    const service = new WorkspaceService(docker, workspaceRepository, imageRepository);

    const createdWorkspace = await service.create('owner-id', {
        catalog_id: catalogImage.id,
    });
    assert.equal(createdWorkspace.status, 'created');
    assert.equal(createdWorkspace.user_id, 'owner-id');
    assert.equal(createdWorkspace.catalog_id, catalogImage.id);
    assert.equal(createdWorkspace.container_id, container.id);
    assert.equal(createdWorkspace.port, receivedCreateOptions?.hostPort);
    assert.ok(createdWorkspace.port >= 30000 && createdWorkspace.port <= 40000);
    assert.equal('vnc_password' in createdWorkspace, false);
    assert.equal(persistedWorkspaces.length, 1);
    assert.equal(receivedCreateOptions?.name.startsWith('workspace-'), true);
    assert.equal(receivedCreateOptions?.imageReference, catalogImage.imageReference);
    assert.equal(receivedCreateOptions?.hostPort, createdWorkspace.port);
    assert.notEqual(receivedCreateOptions?.hostPort, workspace.port);
    assert.equal(typeof receivedCreateOptions?.vncPassword, 'string');
    assert.equal(receivedCreateOptions?.vncPassword.length, 24);
    assert.equal(
        persistedWorkspaces[0]?.vnc_password,
        receivedCreateOptions?.vncPassword,
    );
    const { vnc_password: _ownPassword, ...ownWorkspace } = workspace;
    const { vnc_password: _otherPassword, ...otherWorkspaceItem } = otherWorkspace;
    assert.deepEqual(await service.list('owner-id', false), { own: [ownWorkspace] });
    assert.deepEqual(await service.list('owner-id', true), {
        own: [ownWorkspace],
        all: [ownWorkspace, otherWorkspaceItem],
    });
    assert.equal(await service.get(container.id), container);
    await service.start(container.id);
    await service.stop(container.id);
    await service.restart(container.id);
    await service.remove(container.id);

    assert.deepEqual(calls, [
        'create',
        'get:container-id',
        'start:container-id',
        'stop:container-id',
        'restart:container-id',
        'remove:container-id',
    ]);
    assert.deepEqual(repositoryCalls, [
        'listAll',
        'create',
        'listByUserId:owner-id',
        'listByUserId:owner-id',
        'listAll',
    ]);
});

test('WorkspaceService removes the container if workspace persistence fails', async () => {
    const calls: string[] = [];
    const docker: Pick<
        DockerContainerService,
        'create' | 'get' | 'start' | 'stop' | 'restart' | 'remove'
    > = {
        async create(options) {
            calls.push('create');
            return {
                id: 'container-id',
                name: 'workspace-test',
                imageReference: 'node:22',
                status: 'created',
                hostPort: options.hostPort,
            };
        },
        async get() {
            throw new Error('get must not be called when creating a workspace');
        },
        async start() {
            throw new Error('start must not be called when creating a workspace');
        },
        async stop() {},
        async restart() {},
        async remove() {
            calls.push('remove');
        },
    };
    const workspaceRepository: WorkspaceRepositoryContract = {
        async create() {
            calls.push('persist');
            throw new Error('Lowdb write failed');
        },
        async listByUserId() {
            return [];
        },
        async listAll() {
            return [];
        },
    };
    const service = new WorkspaceService(docker, workspaceRepository, {
        async getById() {
            return {
                id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                name: 'Node',
                imageReference: 'node:22',
                createdAt: new Date().toISOString(),
            };
        },
    });

    await assert.rejects(
        service.create('owner-id', { catalog_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }),
        /Lowdb write failed/,
    );
    assert.deepEqual(calls, ['create', 'persist', 'remove']);
});
