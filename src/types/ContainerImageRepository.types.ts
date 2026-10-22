import type { ContainerImage, EditContainerImage } from '../schemas/ContainerImageSchema.js';

export interface ContainerImageRepositoryContract {
    create(image: ContainerImage): Promise<ContainerImage>;
    list(): Promise<ContainerImage[]>;
    getById(id: string): Promise<ContainerImage>;
    update(id: string, updates: EditContainerImage): Promise<void>;
    delete(id: string): Promise<void>;
}
