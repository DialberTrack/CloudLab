import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { methodNotAllowed } from '../middlewares/method-not-allowed.middleware.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { UserController } from '../controllers/user.controller.js';

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
    .get(UserController.getProfile)
    .all(methodNotAllowed(['GET']));

authRoutes
    .route('/change-password')
    .post(UserController.changePassword)
    .all(methodNotAllowed(['POST']));
