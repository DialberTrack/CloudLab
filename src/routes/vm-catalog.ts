import { Router, type Request, type Response } from "express";

export const vmCatalogRoutes: Router = Router();

function example (req: Request, res: Response) {
    res.json({ url: req.url });
}

vmCatalogRoutes.get('/', example) // GET Obtener catalogo de maquinas virtuales
vmCatalogRoutes.get('/:id', example) // GET Obtener informacion detallada de una maquina virtual del catalogo