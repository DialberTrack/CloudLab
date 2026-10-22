import { Router } from 'express';
import { ContainerImageController } from '../controllers/ContainerImageController.js';
import { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export const containerImageRoutes: Router = Router();

containerImageRoutes.use(AuthMiddleware.authenticate);

containerImageRoutes.get('/', ContainerImageController.listImages);
containerImageRoutes.get('/:id', ContainerImageController.getImage);

containerImageRoutes.use(AuthMiddleware.authorizeAdmin);
containerImageRoutes.post('/', ContainerImageController.createImage);
containerImageRoutes.patch('/:id', ContainerImageController.updateImage);
containerImageRoutes.delete('/:id', ContainerImageController.deleteImage);
