import type { RequestHandler } from 'express';
import { UserRepository } from '../repositories/UserRepository.js';
import { CreateUserSchema, EditUserSchema } from '../schemas/UserSchema.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class UserController {
    public static listUsers: RequestHandler = async (req, res) => {
        const list = await UserRepository.list({
            page: req.query.page,
            limit: req.query.limit,
            q: req.query.q,
        });

        res.json({
            users: list.data,
            pagination: {
                page: list.page,
                limit: list.limit,
                total: list.total,
                totalPages: list.totalPages,
            },
        });
    };

    public static createUser: RequestHandler = async (req, res) => {
        const result = CreateUserSchema.safeParse(req.body ?? {});

        if (!result.success) {
            return res.status(400).json({
                errors: result.error.issues,
            });
        }

        const { name, email, password, role } = result.data;

        const existingUser = await UserRepository.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'El correo electrónico ya está en uso' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await UserRepository.create({
            id: crypto.randomUUID(),
            name,
            email,
            password: hashedPassword,
            role,
            active: true,
            createdAt: new Date().toISOString(),
        });

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
            },
        });
    };

    public static editUser: RequestHandler = async (req, res) => {
        const id = req.params.id as string;
        const result = EditUserSchema.safeParse(req.body ?? {});

        if (!result.success) {
            return res.status(400).json({
                errors: result.error.issues,
            });
        }

        const updates = result.data;
        const { role, active } = updates;
        const self = id === req.user!.id;
        if (self && ((role && role !== 'admin') || active === false)) {
            return res.status(403).json({
                error: 'No puedes cambiar tu propio rol o desactivar tu cuenta. Contacta a un administrador superior.',
            });
        }

        const existingUser = await UserRepository.getById(id);

        if (updates.email && updates.email !== existingUser.email) {
            const userWithEmail = await UserRepository.findByEmail(updates.email);
            if (userWithEmail && userWithEmail.id !== id) {
                return res.status(409).json({ error: 'El correo electrónico ya está en uso' });
            }
        }

        await UserRepository.update(id, updates);
        res.json({ message: 'Usuario actualizado exitosamente' });
    };

    public static deleteUser: RequestHandler = async (req, res) => {
        const id = req.params.id as string;

        if (id === req.user!.id) {
            return res.status(403).json({
                error: 'No puedes eliminar tu propia cuenta. Contacta a un administrador superior.',
            });
        }

        await UserRepository.delete(id);
        return res.json({ message: 'Usuario eliminado exitosamente' });
    };

    public static resetUserPassword: RequestHandler = async (req, res) => {
        const id = req.params.id as string;

        if (id === req.user!.id) {
            return res.status(403).json({
                error: 'No puedes restablecer tu propia contraseña. Contacta a un administrador superior.',
            });
        }

        const newPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await UserRepository.resetPassword(id, hashedPassword);

        return res.json({ message: 'Contraseña restablecida exitosamente', newPassword });
    };
}
