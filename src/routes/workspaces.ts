import { Router, type Request, type Response } from "express";

export const workspacesRoutes: Router = Router();

function example (req: Request, res: Response) {
    res.json({ url: req.url });
}

//workspacesRoutes.get('/', example) // GET Listar workspaces del usuario
//workspacesRoutes.get('/', example) // POST Crear un nuevo workspace del catalogo
//workspacesRoutes.get('/:id', example) // GET Obtiene informacion del workspace
//workspacesRoutes.get('/:id', example) // DELETE Elimina un workspace

//workspacesRoutes.get('/:id/start', example) // POST Enciende un workspace
//workspacesRoutes.get('/:id/stop', example) // POST Apaga un workspace
//workspacesRoutes.get('/:id/restart', example) // POST Reinicia un workspace
//workspacesRoutes.get('/:id/metrics', example) // GET Obtiene metricas de un workspace