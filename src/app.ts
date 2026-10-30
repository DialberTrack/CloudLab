import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { adminRoutes } from './routes/admin.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { containerImagesRoutes } from './routes/container-images.routes.js';
import { internalRoutes } from './routes/internal.routes.js';
import { workspaceRoutes } from './routes/workspaces.routes.js';
import { logger } from './utils/logger.js';
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: env.FRONTEND_URLS,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/container-images', containerImagesRoutes);
app.use('/api/internal', internalRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use(errorMiddleware);

app.listen(env.APP_PORT, () => {
    logger.info(`Aplicación lista en http://${env.APP_HOST}:${env.APP_PORT}`);
});
