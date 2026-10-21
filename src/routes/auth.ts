import { Router, type Request, type Response } from "express";
import { AuthController } from "../controllers/AuthController.js";
import { AuthMiddleware } from "../middlewares/auth.js";

export const authRoutes: Router = Router();

function example(req: Request, res: Response) {
    res.json({ url: req.url });
}

authRoutes.post('/login', AuthController.login);
authRoutes.post('/logout', AuthController.logout);
authRoutes.post('/refresh', AuthController.refresh);

authRoutes.get('/me', AuthMiddleware.authenticate, AuthController.me);
authRoutes.post('/change-password', AuthMiddleware.authenticate, AuthController.changePassword);