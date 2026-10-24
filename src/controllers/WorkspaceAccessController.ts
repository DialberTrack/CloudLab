import type { Request, RequestHandler } from 'express';
import { UserRepository } from '../repositories/UserRepository.js';
import { WorkspaceRepository } from '../repositories/WorkspaceRepository.js';
import type { User } from '../schemas/UserSchema.js';
import type { Workspace } from '../schemas/WorkspaceSchema.js';
import {
    TokenManager,
    WORKSPACE_SESSION_COOKIE,
    workspaceSessionCookieOptions,
} from '../utils/TokenManager.js';

const WORKSPACE_PATH = /^\/workspace\/([0-9a-f-]{36})(?:\/|$)/;

export class WorkspaceAccessController {
    public static authorize: RequestHandler = async (req, res) => {
        const target = WorkspaceAccessController.parseOriginalUri(req);
        if (!target) {
            return res.sendStatus(403);
        }

        const session = TokenManager.verifyWorkspaceSession(
            String(req.cookies?.[WORKSPACE_SESSION_COOKIE] ?? '')
        );
        const user = session ? await UserRepository.findById(session.id) : undefined;
        if (
            !session ||
            !user ||
            !user.active ||
            !TokenManager.isWorkspaceSessionBound(user, session.binding)
        ) {
            return res.sendStatus(401);
        }

        const workspace = await WorkspaceAccessController.findAuthorized(user, target.workspaceId);
        if (!workspace?.port) {
            return res.sendStatus(403);
        }

        const credentials = Buffer.from(`kasm_user:${workspace.vnc_password}`).toString('base64');
        res.set({
            'X-Workspace-Port': String(workspace.port),
            'X-Workspace-Authorization': `Basic ${credentials}`,
        });
        return res.sendStatus(204);
    };

    public static createSession: RequestHandler = async (req, res) => {
        const target = WorkspaceAccessController.parseOriginalUri(req);
        if (!target) {
            return res.status(400).json({ error: 'La solicitud no es válida.' });
        }

        const accessToken = target.url.searchParams.get('accessToken');
        const payload = accessToken ? TokenManager.verifyAccessToken(accessToken) : null;
        const user = payload ? await UserRepository.findById(payload.id) : undefined;
        if (!user || !user.active || !user.refreshToken) {
            return res.status(401).json({ error: 'Se requiere autenticación.' });
        }

        const workspace = await WorkspaceAccessController.findAuthorized(user, target.workspaceId);
        if (!workspace) {
            return res.status(403).json({ error: 'No tienes permisos para acceder al workspace.' });
        }

        res.cookie(
            WORKSPACE_SESSION_COOKIE,
            TokenManager.generateWorkspaceSession(user, user.refreshToken),
            workspaceSessionCookieOptions
        );

        const params = target.url.searchParams;
        params.delete('accessToken');
        if (!params.has('path')) {
            params.set('path', `workspace/${workspace.id}/websockify`);
        }

        res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
        return res.redirect(302, `${target.url.pathname}?${params}`);
    };

    private static async findAuthorized(
        user: User,
        workspaceId: string
    ): Promise<Workspace | null> {
        const workspace = await WorkspaceRepository.findById(workspaceId);
        if (!workspace) {
            return null;
        }

        return user.role === 'admin' || workspace.user_id === user.id ? workspace : null;
    }

    private static parseOriginalUri(req: Request): { workspaceId: string; url: URL } | null {
        const header = req.headers['x-original-uri'];
        if (typeof header !== 'string') {
            return null;
        }

        try {
            const url = new URL(header, 'http://localhost');
            const match = WORKSPACE_PATH.exec(url.pathname);
            return match?.[1] ? { workspaceId: match[1], url } : null;
        } catch {
            return null;
        }
    }
}
