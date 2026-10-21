import { type Request, type Response, type NextFunction } from 'express';
import { TokenManager } from "../utils/TokenManager.js";

export class AuthMiddleware {
    public static authenticate(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers['authorization'];

        if(!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Falta el token de acceso o su formato no es válido.' });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Falta el token de acceso.' });
        }

        const payload = TokenManager.verifyAccessToken(token);
        if (!payload) {
            return res.status(403).json({ message: 'El token de acceso no es válido.' });
        }

        req.user = payload;
        next();
    }
}