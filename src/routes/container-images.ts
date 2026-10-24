import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/AuthMiddleware.js';
import { ContainerImageController } from '../controllers/ContainerImageController.js';
import { methodNotAllowed } from '../middlewares/methodNotAllowed.js';

export const containerImagesRoutes: Router = Router();

containerImagesRoutes.use(AuthMiddleware.authenticate);

containerImagesRoutes
    .route('/')
    .get(ContainerImageController.list)
    .post(ContainerImageController.create)
    .all(methodNotAllowed(['GET', 'POST']));

containerImagesRoutes
    .route('/:id')
    .get(ContainerImageController.get)
    .patch(ContainerImageController.update)
    .delete(ContainerImageController.delete)
    .all(methodNotAllowed(['GET', 'PATCH', 'DELETE']));
