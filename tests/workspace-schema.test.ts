import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkspaceSchema } from '../src/schemas/WorkspaceSchema.js';

test('WorkspaceSchema validates the persisted workspace fields', () => {
    const result = WorkspaceSchema.safeParse({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        catalog_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        container_id: 'container-id',
        port: null,
        status: 'created',
        created_at: '2026-10-22T00:00:00.000Z',
        vnc_password: 'private-password',
    });

    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.data.port, null);
    }
});

test('WorkspaceSchema rejects invalid ports and statuses', () => {
    const result = WorkspaceSchema.safeParse({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        catalog_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        container_id: 'container-id',
        port: 70000,
        status: 'invalid',
        created_at: '2026-10-22T00:00:00.000Z',
        vnc_password: 'private-password',
    });

    assert.equal(result.success, false);
});
