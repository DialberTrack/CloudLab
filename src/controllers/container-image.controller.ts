import type { RequestHandler } from 'express';
import { ValidationError } from '../errors/app.error.js';
import {
    ContainerImageDeletionError,
    ImageAlreadyExistsError,
} from '../errors/container-image.error.js';
import { ContainerImageRepository } from '../repositories/container-image.repository.js';
import {
    ContainerImageIdSchema,
    CreateContainerImageSchema,
    UpdateContainerImageSchema,
} from '../schemas/container-image.schema.js';
import { authed } from '../types/auth-request.js';

export class ContainerImageController {
    /** Lista imágenes activas o todas para administradores. */
    static list: RequestHandler = authed(async (req, res) => {
        const includeInactive = req.user.role === 'admin';
        const containerImages = await ContainerImageRepository.list(includeInactive);
        res.json({ data: containerImages });
    });

    /** Crea una nueva imagen de contenedor. */
    static create: RequestHandler = authed(async (req, res) => {
        const validation = CreateContainerImageSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { image } = validation.data;
        const existingImage = await ContainerImageRepository.findByImage(image);
        if (existingImage) {
            throw new ImageAlreadyExistsError();
        }

        const containerImage = await ContainerImageRepository.create(validation.data);
        res.json({ data: containerImage });
    });

    /** Obtiene una imagen por su identificador. */
    static get: RequestHandler = authed(async (req, res) => {
        const validation = ContainerImageIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { id } = validation.data;
        const includeInactive = req.user.role === 'admin';
        const containerImage = await ContainerImageRepository.getById(id, includeInactive);
        res.json({ data: containerImage });
    });

    /** Actualiza una imagen de contenedor registrada. */
    static update: RequestHandler = authed(async (req, res) => {
        const idValidation = ContainerImageIdSchema.safeParse(req.params);
        if (!idValidation.success) {
            throw new ValidationError(idValidation.error.issues);
        }

        const { id } = idValidation.data;

        const updateValidation = UpdateContainerImageSchema.safeParse(req.body);
        if (!updateValidation.success) {
            throw new ValidationError(updateValidation.error.issues);
        }

        const currentImage = await ContainerImageRepository.getById(id, true);
        const { image } = updateValidation.data;

        if (image && image !== currentImage.image) {
            const existingImage = await ContainerImageRepository.findByImage(image);
            if (existingImage) {
                throw new ImageAlreadyExistsError();
            }
        }

        const updatedContainerImage = await ContainerImageRepository.update(
            id,
            updateValidation.data
        );

        res.json({ data: updatedContainerImage });
    });

    /** Elimina una imagen de contenedor. */
    static delete: RequestHandler = authed(async (req, res) => {
        const validation = ContainerImageIdSchema.safeParse(req.params);
        if (!validation.success) {
            throw new ValidationError(validation.error.issues);
        }

        const { id } = validation.data;

        await ContainerImageRepository.getById(id, true);

        const deleted = await ContainerImageRepository.delete(id);

        if (!deleted) {
            throw new ContainerImageDeletionError();
        }

        res.json({ message: 'Imagen de contenedor eliminada correctamente.' });
    });
}
