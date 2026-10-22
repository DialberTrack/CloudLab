import type { RequestHandler } from 'express';
import crypto from 'crypto';
import { ContainerImageRepository } from '../repositories/ContainerImageRepository.js';
import {
    CreateContainerImageSchema,
    EditContainerImageSchema,
} from '../schemas/ContainerImageSchema.js';

export class ContainerImageController {
    public static createImage: RequestHandler = async (req, res) => {
        const result = CreateContainerImageSchema.safeParse(req.body ?? {});
        if (!result.success) {
            return res.status(400).json({ errors: result.error.issues });
        }

        const image = await ContainerImageRepository.create({
            ...result.data,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        });

        return res.status(201).json({
            message: 'Imagen de contenedor creada en el catálogo',
            image,
        });
    };

    public static listImages: RequestHandler = async (_req, res) => {
        const images = await ContainerImageRepository.list();
        return res.status(200).json({ images });
    };

    public static getImage: RequestHandler = async (req, res) => {
        const id = req.params.id as string;

        const image = await ContainerImageRepository.getById(id);
        return res.json({ image });
    };

    public static updateImage: RequestHandler = async (req, res) => {
        const id = req.params.id as string;
        const result = EditContainerImageSchema.safeParse(req.body ?? {});

        if (!result.success) {
            return res.status(400).json({
                errors: result.error.issues,
            });
        }

        await ContainerImageRepository.update(id, result.data);
        return res.json({ message: 'Imagen de contenedor actualizada correctamente' });
    };

    public static deleteImage: RequestHandler = async (req, res) => {
        const id = req.params.id as string;

        await ContainerImageRepository.delete(id);
        return res.json({ message: 'Imagen de contenedor eliminada exitosamente' });
    };
}
