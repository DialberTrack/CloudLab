import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/AuthMiddleware.js';
import { WorkspaceController } from '../controllers/WorkspaceController.js';

export const createWorkspacesRoutes = (controller: WorkspaceController): Router => {
    const workspacesRoutes: Router = Router();

    workspacesRoutes.use(AuthMiddleware.authenticate);

    workspacesRoutes.get('/', controller.list);
    workspacesRoutes.post('/', controller.create);

    return workspacesRoutes;
};

/*
GET    /api/workspaces              # listar los del usuario; admin podría listar todos
POST   /api/workspaces              # crear
GET    /api/workspaces/:id          # consultar
DELETE /api/workspaces/:id          # eliminar
POST   /api/workspaces/:id/start    # iniciar
POST   /api/workspaces/:id/stop     # detener
POST   /api/workspaces/:id/restart  # reiniciar
GET    /api/workspaces/:id/metrics # consultar métricas
*/
