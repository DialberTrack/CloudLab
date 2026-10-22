import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export const adminRoutes: Router = Router();

adminRoutes.use(AuthMiddleware.authenticate, AuthMiddleware.authorizeAdmin);

adminRoutes.get('/users', UserController.listUsers);
adminRoutes.post('/users', UserController.createUser);
adminRoutes.patch('/users/:id', UserController.editUser);
adminRoutes.delete('/users/:id', UserController.deleteUser);
adminRoutes.post('/users/:id/reset-password', UserController.resetUserPassword);
