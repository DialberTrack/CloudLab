import express from 'express';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.routes.js';
import { workspaceRoutes } from './routes/workspaces.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { containerImagesRoutes } from './routes/container-images.routes.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import cookieParser from 'cookie-parser';
const app = express();

app.disable('x-powered-by');
app.enable('trust proxy');
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/container-images', containerImagesRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use(errorMiddleware);

app.listen(env.APP_PORT, () => {
    console.log(`Aplicación lista en http://${env.APP_HOST}:${env.APP_PORT}`);
});
