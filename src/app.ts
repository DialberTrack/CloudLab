import express from 'express';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.js';
const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.use('/api/auth', authRoutes);

app.listen(env.APP_PORT, () => {
    console.log(`Aplicación lista en http://${env.APP_HOST}:${env.APP_PORT}`);
});
