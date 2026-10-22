import { db } from '../../config/database.js';
import type { ContainerImage, EditContainerImage } from '../../schemas/ContainerImageSchema.js';
import type { ContainerImageRepositoryContract } from '../ContainerImageRepository.js';
import {
    ContainerImageNotFoundError,
    ImageReferenceAlreadyExistsError,
} from '../../errors/ContainerImageErrors.js';

export class LowdbContainerImageRepository implements ContainerImageRepositoryContract {
    async create(image: ContainerImage): Promise<ContainerImage> {
        this.ensureUniqueReference(image.imageReference);
        db.data.containerImages.push(image);
        await db.write();
        return image;
    }

    async list(): Promise<ContainerImage[]> {
        return db.data.containerImages;
    }

    async getById(id: string): Promise<ContainerImage> {
        const image = db.data.containerImages.find((image) => image.id === id);
        if (!image) {
            throw new ContainerImageNotFoundError();
        }
        return image;
    }

    async update(id: string, updates: EditContainerImage): Promise<void> {
        const image = db.data.containerImages.find((image) => image.id === id);
        if (!image) {
            throw new ContainerImageNotFoundError();
        }

        if (updates.imageReference !== undefined) {
            this.ensureUniqueReference(updates.imageReference, id);
            image.imageReference = updates.imageReference;
        }
        if (updates.description !== undefined) {
            image.description = updates.description;
        }
        if (updates.iconUrl !== undefined) {
            image.iconUrl = updates.iconUrl;
        }
        if (updates.name !== undefined) {
            image.name = updates.name;
        }

        await db.write();
    }

    async delete(id: string): Promise<void> {
        const imageIndex = db.data.containerImages.findIndex((image) => image.id === id);
        if (imageIndex === -1) {
            throw new ContainerImageNotFoundError();
        }

        db.data.containerImages.splice(imageIndex, 1);
        await db.write();
    }

    private ensureUniqueReference(reference: string, excludeId?: string): void {
        const normalizedReference = reference.toLowerCase();
        const duplicate = db.data.containerImages.some(
            (image) =>
                image.id !== excludeId && image.imageReference.toLowerCase() === normalizedReference
        );

        if (duplicate) {
            throw new ImageReferenceAlreadyExistsError();
        }
    }
}
