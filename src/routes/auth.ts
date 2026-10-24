import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { methodNotAllowed } from '../middlewares/methodNotAllowed.js';
import { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export const authRoutes: Router = Router();

authRoutes
    .route('/login')
    .post(AuthController.login)
    .all(methodNotAllowed(['POST']));

authRoutes
    .route('/logout')
    .post(AuthController.logout)
    .all(methodNotAllowed(['POST']));

authRoutes
    .route('/refresh')
    .post(AuthController.refresh)
    .all(methodNotAllowed(['POST']));

authRoutes.use(AuthMiddleware.authenticate);

authRoutes
    .route('/me')
    .get(AuthController.me)
    .all(methodNotAllowed(['GET']));

authRoutes
    .route('/change-password')
    .post(AuthController.changePassword)
    .all(methodNotAllowed(['POST']));
