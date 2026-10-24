import type { RequestHandler } from 'express';

export class ContainerImageController {
    static list: RequestHandler = (req, res) => {
        // Lógica para obtener todas las imágenes de contenedor
    };

    static create: RequestHandler = (req, res) => {
        // Lógica para crear una nueva imagen de contenedor
    };

    static get: RequestHandler = (req, res) => {
        // Lógica para obtener una imagen de contenedor específica por ID
    };

    static update: RequestHandler = (req, res) => {
        // Lógica para editar una imagen de contenedor existente
    };

    static delete: RequestHandler = (req, res) => {
        // Lógica para eliminar una imagen de contenedor
    };
}
