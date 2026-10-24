import { Router } from 'express';
import { WorkspaceAccessController } from '../controllers/WorkspaceAccessController.js';
import { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export const internalRoutes: Router = Router();

internalRoutes.use(AuthMiddleware.internalOnly);

internalRoutes.get('/workspace-auth', WorkspaceAccessController.authorize);
internalRoutes.get('/workspace-session', WorkspaceAccessController.createSession);
