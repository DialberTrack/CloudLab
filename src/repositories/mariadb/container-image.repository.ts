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
    /**
     * Lista imágenes activas para usuarios o todas las imágenes para administradores.
     *
     * @param includeInactive Si es `true`, incluye imágenes desactivadas.
     *
     * @returns {Promise<ContainerImage[]>} Lista de imágenes de contenedor.
     * @throws {Error} Si MariaDB rechaza la consulta.
     */
    async list(includeInactive = false): Promise<ContainerImage[]> {
        const whereClause = includeInactive ? '' : 'WHERE is_active = 1';
        const [containerImages] = await pool.query<ContainerImageRow[]>(
            `SELECT *
             FROM container_images
             ${whereClause}
             ORDER BY sort_order ASC, name ASC`
        );
        return containerImages;
    }

    /**
     * Busca una imagen de contenedor por su ID sin lanzar cuando no existe.
     *
     * @param id UUID de la imagen de contenedor.
     * @returns {Promise<ContainerImage | null>} Imagen de contenedor encontrada o `null`.
     * @throws {Error} Si MariaDB rechaza la consulta.
     */
    async findById(id: string): Promise<ContainerImage | null> {
        const [containerImages] = await pool.query<ContainerImageRow[]>(
            'SELECT * FROM container_images WHERE id = ?',
            [id]
        );

        return containerImages[0] ?? null;
    }

    /**
     * Obtiene una imagen de contenedor por su ID, activa por defecto.
     *
     * @param id UUID de la imagen de contenedor.
     * @param includeInactive Si es `true`, permite obtener una imagen desactivada.
     * @returns {Promise<ContainerImage>} Imagen de contenedor encontrada.
     * @throws {ContainerImageNotFoundError} Si la imagen no existe.
     */
    async getById(id: string, includeInactive = false): Promise<ContainerImage> {
        const containerImage = await this.findById(id);

        if (containerImage && (includeInactive || containerImage.is_active)) {
            return containerImage;
        }

        throw new ContainerImageNotFoundError();
    }

    /**
     * Busca una imagen de contenedor por su nombre sin lanzar cuando no existe.
     *
     * @param image Nombre de la imagen de contenedor.
     * @returns {Promise<ContainerImage | null>} Imagen de contenedor encontrada o `null`.
     * @throws {Error} Si MariaDB rechaza la consulta.
     */
    async findByImage(image: string): Promise<ContainerImage | null> {
        const [containerImages] = await pool.query<ContainerImageRow[]>(
            'SELECT * FROM container_images WHERE image = ?',
            [image]
        );

        return containerImages[0] ?? null;
    }

    /**
     * Obtiene una imagen de contenedor por su nombre.
     *
     * @param image Nombre de la imagen de contenedor.
     * @returns {Promise<ContainerImage>} Imagen de contenedor encontrada.
     * @throws {ContainerImageNotFoundError} Si la imagen no existe.
     */
    async getByImage(image: string): Promise<ContainerImage> {
        const containerImage = await this.findByImage(image);

        if (containerImage) {
            return containerImage;
        }

        throw new ContainerImageNotFoundError();
    }

    /**
     * Crea una nueva imagen de contenedor en la base de datos.
     *
     * @param containerImage Datos de la imagen de contenedor a crear.
     * @returns {Promise<ContainerImage>} La imagen de contenedor creada.
     * @throws {Error} Si MariaDB rechaza la consulta.
     */
    async create(containerImage: CreateContainerImageInput): Promise<ContainerImage> {
        const dataToInsert = Object.fromEntries(
            Object.entries(containerImage).filter(([, value]) => value !== undefined)
        );
        await pool.query('INSERT INTO container_images SET ?', [dataToInsert]);

        return await this.getByImage(containerImage.image);
    }

    /**
     * Actualiza una imagen de contenedor existente en la base de datos.
     *
     * @param id UUID de la imagen de contenedor a actualizar.
     * @param containerImage Datos de la imagen de contenedor a actualizar.
     * @returns {Promise<ContainerImage | null>} La imagen de contenedor actualizada o `null` si no existe.
     * @throws {Error} Si MariaDB rechaza la consulta.
     */
    async update(
        id: string,
        containerImage: UpdateContainerImageInput
    ): Promise<ContainerImage | null> {
        if (Object.keys(containerImage).length > 0) {
            await pool.query('UPDATE container_images SET ? WHERE id = ?', [containerImage, id]);
        }

        return await this.findById(id);
    }

    /**
     * Elimina una imagen de contenedor de la base de datos.
     *
     * @param id UUID de la imagen de contenedor a eliminar.
     * @returns {Promise<boolean>} `true` si se eliminó, `false` si no existía.
     * @throws {Error} Si MariaDB rechaza la consulta.
     */
    async delete(id: string): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            'DELETE FROM container_images WHERE id = ?',
            [id]
        );

        return result.affectedRows > 0;
    }
}
