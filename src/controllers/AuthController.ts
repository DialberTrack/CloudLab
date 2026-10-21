import { type RequestHandler } from "express";
import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import { UserRepository } from "../models/UserRepository.js";
import { ChangePasswordSchema, LoginSchema } from "../schemas/UserSchema.js";
import { TokenManager } from "../utils/TokenManager.js";

const refreshCookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: env.JWT_REFRESH_COOKIE_MAX_AGE_MS
};

export class AuthController {
    public static login: RequestHandler = async (req, res) => {
        const result = LoginSchema.safeParse(req.body ?? {});
        if (!result.success) {
            return res.status(400).json({ errors: result.error.issues });
        }

        const { email, password } = result.data;
        const user = await UserRepository.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Email o contraseña incorrectos" });
        }

        if (!user.active) {
            return res.status(403).json({ error: "La cuenta está desactivada. Contacta al administrador." });
        }

        const accessToken = TokenManager.generateAccessToken(user);
        const refreshToken = TokenManager.generateRefreshToken(user);
        await UserRepository.updateRefreshToken(user.id, refreshToken);

        res.cookie("refreshToken", refreshToken, refreshCookieOptions);
        return res.json({
            message: "Inicio de sesión exitoso",
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    };

    public static logout: RequestHandler = async (req, res) => {
        const refreshToken = req.cookies?.refreshToken;
        if (typeof refreshToken === "string") {
            const decoded = TokenManager.verifyRefreshToken(refreshToken);
            if (decoded) {
                await UserRepository.updateRefreshToken(decoded.id, "");
            }
        }

        res.clearCookie("refreshToken", {
            httpOnly: refreshCookieOptions.httpOnly,
            secure: refreshCookieOptions.secure,
            sameSite: refreshCookieOptions.sameSite
        });
        return res.json({ message: "Sesión cerrada correctamente" });
    };

    public static refresh: RequestHandler = async (req, res) => {
        const refreshToken = req.cookies?.refreshToken;
        if (typeof refreshToken !== "string" || !refreshToken) {
            return res.status(401).json({ error: "No se proporcionó el token de renovación." });
        }

        const decoded = TokenManager.verifyRefreshToken(refreshToken);
        if (!decoded) {
            res.clearCookie("refreshToken", {
                httpOnly: refreshCookieOptions.httpOnly,
                secure: refreshCookieOptions.secure,
                sameSite: refreshCookieOptions.sameSite
            });
            return res.status(403).json({ error: "El token de renovación no es válido." });
        }

        const user = await UserRepository.findById(decoded.id);
        if (!user || !user.active || user.refreshToken !== refreshToken) {
            res.clearCookie("refreshToken", {
                httpOnly: refreshCookieOptions.httpOnly,
                secure: refreshCookieOptions.secure,
                sameSite: refreshCookieOptions.sameSite
            });
            return res.status(403).json({ error: "El token de renovación no es válido." });
        }

        const accessToken = TokenManager.generateAccessToken(user);
        return res.json({
            message: "Token renovado correctamente",
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    };

    public static me: RequestHandler = (req, res) => {
        return res.json({ message: "Información del usuario", user: req.user });
    };

    public static changePassword: RequestHandler = async (req, res) => {
        const result = ChangePasswordSchema.safeParse(req.body ?? {});
        if (!result.success) {
            return res.status(400).json({ errors: result.error.issues });
        }

        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Se requiere autenticación." });
        }

        const { current, password } = result.data;
        const user = await UserRepository.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        if (!(await bcrypt.compare(current, user.password))) {
            return res.status(400).json({ error: "La contraseña actual es incorrecta" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await UserRepository.updatePassword(user.id, hashedPassword);

        const newRefreshToken = TokenManager.generateRefreshToken(user);
        await UserRepository.updateRefreshToken(user.id, newRefreshToken);
        res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);
        return res.json({ message: "Contraseña cambiada correctamente" });
    };
}
