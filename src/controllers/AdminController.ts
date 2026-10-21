import type { RequestHandler } from "express";
import { UserRepository } from "../models/UserRepository.js";
import { CreateUserSchema, EditUserSchema } from "../schemas/UserSchema.js";
import bcrypt from "bcrypt";

export class AdminController {
    public static listUsers: RequestHandler = async (req, res) => {
        const list = await UserRepository.listUsers({
            page: req.query.page,
            limit: req.query.limit,
            q: req.query.q
        });

        res.json({
            users: list.data,
            pagination: {
                page: list.page,
                limit: list.limit,
                total: list.total,
                totalPages: list.totalPages
            }
        });
    }

    public static createUser: RequestHandler = async (req, res) => {
        const result = CreateUserSchema.safeParse(req.body ?? {});

        if (!result.success) {
            return res.status(400).json({
                errors: result.error.issues
            });
        }

        const { name, email, password, role } = result.data;

        const existingUser = await UserRepository.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: "El correo electrónico ya está en uso" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await UserRepository.create({
            id: crypto.randomUUID(),
            name,
            email,
            password: hashedPassword,
            role,
            active: true,
            createdAt: new Date().toISOString()
        });

        res.status(201).json({
            message: "Usuario creado exitosamente",
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    }

    public static editUser: RequestHandler = async (req, res) => {
        const userId = req.params.id as string;
        const result = EditUserSchema.safeParse(req.body ?? {});

        if (!result.success) {
            return res.status(400).json({
                errors: result.error.issues
            });
        }

        const updates = result.data;
        const { role, active } = updates;
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({ error: "Se requiere autenticación." });
        }

        const self = userId === currentUser.id;
        if (self && ((role && role !== "admin") || active === false)) {
            return res.status(403).json({ error: 'No puedes cambiar tu propio rol o desactivar tu cuenta. Contacta a un administrador superior.' });
        }

        const existingUser = await UserRepository.findById(userId);
        if (!existingUser) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        if (updates.email && updates.email !== existingUser.email) {
            const userWithEmail = await UserRepository.findByEmail(updates.email);
            if (userWithEmail && userWithEmail.id !== userId) {
                return res.status(409).json({ error: "El correo electrónico ya está en uso" });
            }
        }

        await UserRepository.updateUser(userId, updates);
        res.json({ message: "Usuario actualizado exitosamente" });
    }

    public static deleteUser: RequestHandler = async (req, res) => {
        // Lógica para eliminar un usuario
        res.json({ message: `Usuario ${req.params.id} eliminado` });
    }

    public static resetUserPassword: RequestHandler = (req, res) => {
        // Lógica para reiniciar la contraseña de un usuario
        res.json({ message: `Contraseña del usuario ${req.params.id} reiniciada` });
    }

    public static createVmCatalog: RequestHandler = (req, res) => {
        // Lógica para crear una máquina virtual en el catálogo
        res.json({ message: 'Máquina virtual creada en el catálogo' });
    }

    public static updateVmCatalog: RequestHandler = (req, res) => {
        // Lógica para actualizar una máquina virtual del catálogo
        res.json({ message: `Máquina virtual ${req.params.id} actualizada en el catálogo` });
    }

    public static deleteVmCatalog: RequestHandler = (req, res) => {
        // Lógica para eliminar una máquina virtual del catálogo
        res.json({ message: `Máquina virtual ${req.params.id} eliminada del catálogo` });
    }

    public static listWorkspaces: RequestHandler = (req, res) => {
        // Lógica para listar todos los workspaces existentes
        res.json({ message: 'Lista de workspaces' });
    }

    public static deleteWorkspace: RequestHandler = (req, res) => {
        // Lógica para eliminar un workspace
        res.json({ message: `Workspace ${req.params.id} eliminado` });
    }

    public static stopWorkspace: RequestHandler = (req, res) => {
        // Lógica para detener un workspace
        res.json({ message: `Workspace ${req.params.id} detenido` });
    }

    public static restartWorkspace: RequestHandler = (req, res) => {
        // Lógica para reiniciar un workspace
        res.json({ message: `Workspace ${req.params.id} reiniciado` });
    }

    public static getSystemMetrics: RequestHandler = (req, res) => {
        // Lógica para conseguir las métricas del servidor
        res.json({ message: 'Métricas del servidor' });
    }
}