import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../../config/mariadb.config.js';
import { ContainerImageNotFoundError } from '../../errors/container-image.error.js';
import type {
    ContainerImage,
    CreateContainerImageInput,
    UpdateContainerImageInput,
} from '../../schemas/container-image.schema.js';
import type { ContainerImageRepository } from '../container-image.repository.js';

type ContainerImageRow = ContainerImage & RowDataPacket;

export class MariaDBContainerImageRepository implements ContainerImageRepository {
    /** Lista las imágenes activas o todas si se solicita. */
    async list(includeInactive = false): Promise<ContainerImage[]> {
        const activeFilter = includeInactive ? '' : 'WHERE is_active = 1';
        const [rows] = await pool.query<ContainerImageRow[]>(
            `SELECT *
             FROM container_images
             ${activeFilter}
             ORDER BY sort_order ASC, name ASC`
        );
        return rows;
    }

    /** Busca una imagen por su ID sin lanzar error si no existe. */
    async findById(id: string): Promise<ContainerImage | null> {
        const [rows] = await pool.query<ContainerImageRow[]>(
            'SELECT * FROM container_images WHERE id = ?',
            [id]
        );

        return rows[0] ?? null;
    }

    /** Obtiene una imagen por su ID. */
    async getById(id: string, includeInactive = false): Promise<ContainerImage> {
        const containerImage = await this.findById(id);

        if (containerImage && (includeInactive || containerImage.is_active)) {
            return containerImage;
        }

        throw new ContainerImageNotFoundError();
    }

    /** Busca una imagen por su nombre sin lanzar error si no existe. */
    async findByImage(image: string): Promise<ContainerImage | null> {
        const [rows] = await pool.query<ContainerImageRow[]>(
            'SELECT * FROM container_images WHERE image = ?',
            [image]
        );

        return rows[0] ?? null;
    }

    /** Obtiene una imagen por su nombre. */
    async getByImage(image: string): Promise<ContainerImage> {
        const containerImage = await this.findByImage(image);

        if (containerImage) {
            return containerImage;
        }

        throw new ContainerImageNotFoundError();
    }

    /** Crea una imagen de contenedor. */
    async create(containerImage: CreateContainerImageInput): Promise<ContainerImage> {
        await pool.query('INSERT INTO container_images SET ?', [containerImage]);

        return this.getByImage(containerImage.image);
    }

    /** Actualiza una imagen existente. */
    async update(
        id: string,
        containerImage: UpdateContainerImageInput
    ): Promise<ContainerImage | null> {
        if (Object.keys(containerImage).length > 0) {
            await pool.query('UPDATE container_images SET ? WHERE id = ?', [containerImage, id]);
        }

        return this.findById(id);
    }

    /** Elimina una imagen. */
    async delete(id: string): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            'DELETE FROM container_images WHERE id = ?',
            [id]
        );

        return result.affectedRows > 0;
    }
}
