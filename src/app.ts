import express from 'express';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { containerImageRoutes } from './routes/container-images.js';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/errorHandler.js';
import { workspacesRoutes } from './routes/workspaces.js';
const app = express();

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
