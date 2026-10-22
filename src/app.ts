import express from 'express';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { containerImageRoutes } from './routes/container-images.js';
import { createWorkspacesRoutes } from './routes/workspaces.js';
import { WorkspaceController } from './controllers/WorkspaceController.js';
import { WorkspaceService } from './services/WorkspaceService.js';
import { DockerContainerService } from './docker/DockerContainerService.js';
import { WorkspaceRepository } from './repositories/WorkspaceRepository.js';
import { ContainerImageRepository } from './repositories/ContainerImageRepository.js';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/errorHandler.js';
const app = express();
const workspaceService = new WorkspaceService(
    new DockerContainerService(),
    WorkspaceRepository,
    ContainerImageRepository,
);
const workspacesRoutes = createWorkspacesRoutes(new WorkspaceController(workspaceService));

app.disable('x-powered-by');
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/container-images', containerImageRoutes);
app.use('/api/workspaces', workspacesRoutes);

app.use((_req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado' });
});
app.use(errorHandler);

app.listen(env.PORT, () => {
    console.log(`Aplicación lista en http://localhost:${env.PORT}`);
});
