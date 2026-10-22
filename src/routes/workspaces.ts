import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export const workspacesRoutes: Router = Router();
workspacesRoutes.use(AuthMiddleware.authenticate);
