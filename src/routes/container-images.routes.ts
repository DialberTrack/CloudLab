import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { ContainerImageController } from '../controllers/container-image.controller.js';
import { methodNotAllowed } from '../middlewares/method-not-allowed.middleware.js';

export const containerImagesRoutes: Router = Router();

containerImagesRoutes.use(AuthMiddleware.authenticate);

containerImagesRoutes
    .route('/')
    .get(ContainerImageController.list)
    .post(AuthMiddleware.authorizeAdmin, ContainerImageController.create)
    .all(methodNotAllowed(['GET', 'POST']));

containerImagesRoutes
    .route('/:id')
    .get(ContainerImageController.get)
    .patch(AuthMiddleware.authorizeAdmin, ContainerImageController.update)
    .delete(AuthMiddleware.authorizeAdmin, ContainerImageController.delete)
    .all(methodNotAllowed(['GET', 'PATCH', 'DELETE']));
