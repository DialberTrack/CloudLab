import type { RequestHandler } from "express";
import { UserRepository } from "../models/UserRepository.js";
import { CreateUserSchema } from "../schemas/UserSchema.js";
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
        const result = await CreateUserSchema.safeParse(req.body ?? {});

        if (!result.success) {
            return res.status(400).json({
                errors: result.error.issues
            });
        }

        const { name, email, password, role } = result.data;

        try {
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
                createdAt: new Date()
            });

            res.status(201).json({
                message: 'Usuario creado exitosamente',
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role
                }
            });
        } catch (error) {
            console.error('Error al crear usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    public static editUser: RequestHandler = async (req, res) => {
        // Lógica para editar un usuario
        res.json({ message: `Usuario ${req.params.id} editado` });
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