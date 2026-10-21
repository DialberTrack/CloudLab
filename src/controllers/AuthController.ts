import { type RequestHandler } from 'express';
import { LoginSchema, ChangePasswordSchema } from '../schemas/UserSchema.js';
import { UserRepository } from '../models/UserRepository.js';
import bcrypt from 'bcrypt';
import { TokenManager } from '../utils/TokenManager.js';

export class AuthController {
    public static login: RequestHandler = async (req, res) => {
        const result = LoginSchema.safeParse(req.body ?? {});
        
        if (!result.success) {
            return res.status(400).json({ 
                errors: result.error.issues
            });
        }
        
        const { email, password } = result.data;

        try {
            const user = await UserRepository.findByEmail(email);

            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).json({ error: 'Email o contraseña incorrectos' });
            }

            if (user.active === false) {
                return res.status(403).json({ error: 'La cuenta está desactivada. Contacta al administrador.' });
            }

            const accessToken = TokenManager.generateAccessToken(user);
            const refreshToken = TokenManager.generateRefreshToken(user);

            await UserRepository.updateRefreshToken(user.id, refreshToken);

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
            });

            res.json({ message: 'Inicio de sesión exitoso',
                accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    public static logout: RequestHandler = async (req, res) => {
        const refreshToken = req.cookies.refreshToken;

        if(refreshToken) {
            try {
                const decoded = TokenManager.verifyRefreshToken(refreshToken);

                if(decoded && 'id' in decoded) {
                    await UserRepository.updateRefreshToken(decoded.id, '');
                }
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
            }
        }

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.json({ message: 'Sesión cerrada correctamente' });
    }

    public static refresh: RequestHandler = async (req, res) => {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ error: 'No se proporcionó el token de renovación.' });
        }

        const decoded = TokenManager.verifyRefreshToken(refreshToken);

        if (!decoded || !('id' in decoded)) {
            return res.status(403).json({ error: 'El token de renovación no es válido.' });
        }

        try {
            const user = await UserRepository.findById(decoded.id);

            if (!user || !user.active || user.refreshToken !== refreshToken) {
                return res.status(403).json({ error: 'El token de renovación no es válido.' });
            }

            const newAccessToken = TokenManager.generateAccessToken(user);

            res.json({ message: 'Token renovado correctamente',
                accessToken: newAccessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Error al renovar el token:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    public static me: RequestHandler = async (req, res) => {
        res.json({ message: 'Información del usuario', user: req.user });
    }

    public static changePassword: RequestHandler = async (req, res) => {
        const result = ChangePasswordSchema.safeParse(req.body ?? {});
        
        if (!result.success) {
            return res.status(400).json({ 
                errors: result.error.issues
            });
        }
        
        const { current, password } = result.data;

        try {
            const user = await UserRepository.findById(req.user!.id);

            if (!user) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            if (!(await bcrypt.compare(current, user.password))) {
                return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            await UserRepository.updatePassword(user.id, hashedPassword);

            const newRefreshToken = TokenManager.generateRefreshToken(user);
            await UserRepository.updateRefreshToken(user.id, newRefreshToken);
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
            });

            res.json({ message: 'Contraseña cambiada correctamente' });
        } catch (error) {
            console.error('Error al cambiar la contraseña:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
}