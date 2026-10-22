import { Router, type Request, type Response } from "express";
import { AdminController } from "../controllers/AdminController.js";
import { AuthMiddleware } from "../middlewares/auth.js";

export const adminRoutes: Router = Router();

adminRoutes.use(AuthMiddleware.authenticate, AuthMiddleware.authorizeAdmin);

adminRoutes.get('/users', AdminController.listUsers);
adminRoutes.post('/users', AdminController.createUser);
adminRoutes.patch('/users/:id', AdminController.editUser);
adminRoutes.delete('/users/:id', AdminController.deleteUser);
adminRoutes.post('/users/:id/reset-password', AdminController.resetUserPassword);

//adminRoutes.get('/vm-catalog', example) // POST Crear maquina virtual en el catalogo
//adminRoutes.get('/vm-catalog/:id', example) // PATCH Actualizar maquina virtual del catalogo
//adminRoutes.get('/vm-catalog/:id', example) // DELETE Eliminar maquina virtual del catalogo

//adminRoutes.get('/workspaces/', example) // GET Lista todos los workspace existentes
//adminRoutes.get('/workspaces/:id', example) // DELETE Elimina el workspace indicado
//adminRoutes.get('/workspaces/:id/stop', example) // POST Detiene el workspace indicado
//adminRoutes.get('/workspaces/:id/restart', example) // POST Reinicia el workspace indicado

//adminRoutes.get('/system/metrics', example) // GET Consigue las metricas del servidor