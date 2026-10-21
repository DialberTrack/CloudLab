import express, { type NextFunction, type Request, type Response } from 'express'
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { vmCatalogRoutes } from './routes/vm-catalog.js';
import { workspacesRoutes } from './routes/workspaces.js';
import cookieParser from 'cookie-parser';
const app = express()

const PORT = process.env.PORT || "8000";

app.use(express.json())
app.use(cookieParser());

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'El cuerpo de la solicitud (JSON) está mal formado o contiene errores de sintaxis.'
        });
    }
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vm-catalog', vmCatalogRoutes);
app.use('/api/workspaces', workspacesRoutes);

app.listen(PORT, () => {
    console.log("Aplicación lista en http://192.168.1.10:" + PORT);
})