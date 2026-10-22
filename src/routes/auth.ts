import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export const authRoutes: Router = Router();

authRoutes.post('/login', AuthController.login);
authRoutes.post('/logout', AuthController.logout);
authRoutes.post('/refresh', AuthController.refresh);

authRoutes.use(AuthMiddleware.authenticate);
authRoutes.get('/me', AuthController.me);
authRoutes.post('/change-password', AuthController.changePassword);
