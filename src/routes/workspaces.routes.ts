import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { methodNotAllowed } from '../middlewares/method-not-allowed.middleware.js';

export const workspaceRoutes: Router = Router();

workspaceRoutes.use(AuthMiddleware.authenticate);

workspaceRoutes
    .route('/')
    .get(WorkspaceController.list)
    .post(WorkspaceController.create)
    .all(methodNotAllowed(['GET', 'POST']));

workspaceRoutes
    .route('/:id')
    .get(WorkspaceController.get)
    .delete(WorkspaceController.delete)
    .all(methodNotAllowed(['GET', 'PATCH', 'DELETE']));

workspaceRoutes
    .route('/:id/start')
    .post(WorkspaceController.start)
    .all(methodNotAllowed(['POST']));

workspaceRoutes
    .route('/:id/stop')
    .post(WorkspaceController.stop)
    .all(methodNotAllowed(['POST']));

workspaceRoutes
    .route('/:id/restart')
    .post(WorkspaceController.restart)
    .all(methodNotAllowed(['POST']));

workspaceRoutes
    .route('/:id/metrics')
    .get(WorkspaceController.metrics)
    .all(methodNotAllowed(['GET']));
