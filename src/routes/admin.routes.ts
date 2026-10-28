import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { WorkspaceController } from '../controllers/workspace.controller.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { methodNotAllowed } from '../middlewares/method-not-allowed.middleware.js';

export const adminRoutes: Router = Router();

adminRoutes.use(AuthMiddleware.authenticate, AuthMiddleware.authorizeAdmin);

adminRoutes
    .route('/users')
    .get(UserController.list)
    .post(UserController.create)
    .all(methodNotAllowed(['GET', 'POST']));

adminRoutes
    .route('/users/:id')
    .get(UserController.get)
    .patch(UserController.update)
    .delete(UserController.delete)
    .all(methodNotAllowed(['GET', 'PATCH', 'DELETE']));

adminRoutes
    .route('/users/:id/reset-password')
    .post(UserController.resetPassword)
    .all(methodNotAllowed(['POST']));

adminRoutes
    .route('/workspaces')
    .get(WorkspaceController.listAll)
    .all(methodNotAllowed(['GET']));
