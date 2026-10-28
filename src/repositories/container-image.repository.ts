import type {
    ContainerImage,
    CreateContainerImageInput,
    UpdateContainerImageInput,
} from '../schemas/container-image.schema.js';
import { MariaDBContainerImageRepository } from './mariadb/container-image.repository.js';
export interface ContainerImageRepository {
    list(includeInactive?: boolean): Promise<ContainerImage[]>;
    findById(id: string): Promise<ContainerImage | null>;
    getById(id: string, includeInactive?: boolean): Promise<ContainerImage>;
    findByImage(image: string): Promise<ContainerImage | null>;
    getByImage(image: string): Promise<ContainerImage>;
    create(containerImage: CreateContainerImageInput): Promise<ContainerImage>;
    update(id: string, containerImage: UpdateContainerImageInput): Promise<ContainerImage | null>;
    delete(id: string): Promise<boolean>;
}

export const ContainerImageRepository = new MariaDBContainerImageRepository();
