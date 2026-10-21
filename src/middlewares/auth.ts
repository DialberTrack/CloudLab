import type { RequestHandler } from "express";
import { UserRepository } from "../models/UserRepository.js";
import { TokenManager } from "../utils/TokenManager.js";

export class AuthMiddleware {
    public static authenticate: RequestHandler = async (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Falta el token de acceso o su formato no es válido." });
        }

        const token = authHeader.slice("Bearer ".length).trim();
        if (!token) {
            return res.status(401).json({ message: "Falta el token de acceso." });
        }

        const payload = TokenManager.verifyAccessToken(token);
        if (!payload) {
            return res.status(403).json({ message: "El token de acceso no es válido." });
        }

        const user = await UserRepository.findById(payload.id);
        if (!user || !user.active) {
            return res.status(401).json({ message: "La cuenta no existe o está desactivada." });
        }

        req.user = { ...payload, role: user.role };
        return next();
    };

    public static authorizeAdmin: RequestHandler = (req, res, next) => {
        if (req.user?.role !== "admin") {
            return res.status(403).json({ message: "No tienes permisos para acceder a este recurso." });
        }
        return next();
    };
}
