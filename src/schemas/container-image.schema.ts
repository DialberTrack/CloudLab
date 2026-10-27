import z from 'zod';

// Database schema for the container_images table:
// +-------------+--------------+------+-----+---------------------+-------------------------------+
// | Field       | Type         | Null | Key | Default             | Extra                         |
// +-------------+--------------+------+-----+---------------------+-------------------------------+
// | id          | uuid         | NO   | PRI | uuid()              |                               |
// | name        | varchar(100) | NO   |     | NULL                |                               |
// | image       | varchar(255) | NO   | UNI | NULL                |                               |
// | description | text         | YES  |     | NULL                |                               |
// | icon        | varchar(255) | YES  |     | NULL                |                               |
// | is_active   | tinyint(1)   | NO   | MUL | 1                   |                               |
// | sort_order  | int(11)      | NO   |     | 0                   |                               |
// | created_at  | datetime     | NO   |     | current_timestamp() |                               |
// | updated_at  | datetime     | NO   |     | current_timestamp() | on update current_timestamp() |
// +-------------+--------------+------+-----+---------------------+-------------------------------+

const dockerNameRegex =
    /^(?:([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(?::(\d+))?\/)?((?:[a-zA-Z0-9_-]*\/)*?)([a-zA-Z0-9_-]+)(?::([\w.-]+))?$/;

const containerImageIdSchema = z.uuid('El ID de la imagen de contenedor debe ser un UUID válido.');

const nameSchema = z
    .string({ message: 'El nombre debe ser texto.' })
    .trim()
    .min(3, 'Se requiere un nombre de al menos 3 caracteres.')
    .max(100, 'El nombre no puede exceder los 100 caracteres.');

const imageSchema = z
    .string({ message: 'La imagen debe ser texto.' })
    .trim()
    .min(1, 'Se requiere una imagen de al menos 1 caracter.')
    .max(255, 'La imagen no puede exceder los 255 caracteres.')
    .toLowerCase()
    .regex(dockerNameRegex, 'La imagen no tiene un formato válido.');

const descriptionSchema = z
    .string({ message: 'La descripción debe ser texto.' })
    .trim()
    .max(65535, 'La descripción no puede exceder los 65535 caracteres.')
    .nullish(); // Permite undefined y null (ideal para campos con YES en la BD)

const iconSchema = z
    .string({ message: 'El icono debe ser texto.' })
    .trim()
    .max(255, 'El icono no puede exceder los 255 caracteres.')
    .nullish(); // Permite undefined y null

const isActiveSchema = z.boolean({
    message: 'El estado activo debe ser un valor booleano.',
});

const sortOrderSchema = z
    .number({ message: 'El orden de clasificación debe ser un número.' })
    .int('El orden de clasificación debe ser un número entero.')
    .min(0, 'El orden de clasificación no puede ser negativo.');

const createdAtSchema = z.date({
    message: 'La fecha de creación debe ser una fecha válida.',
});

const updatedAtSchema = z.date({
    message: 'La fecha de actualización debe ser una fecha válida.',
});

export const ContainerImageSchema = z.object({
    id: containerImageIdSchema,
    name: nameSchema,
    image: imageSchema,
    description: descriptionSchema,
    icon: iconSchema,
    is_active: isActiveSchema,
    sort_order: sortOrderSchema,
    created_at: createdAtSchema,
    updated_at: updatedAtSchema,
});

export const CreateContainerImageSchema = ContainerImageSchema.pick({
    name: true,
    image: true,
    icon: true,
    description: true,
}).extend({
    sort_order: sortOrderSchema.default(0),
    is_active: isActiveSchema.default(true),
});

export const UpdateContainerImageSchema = ContainerImageSchema.pick({
    name: true,
    image: true,
    description: true,
    icon: true,
    is_active: true,
    sort_order: true,
})
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'Se requiere al menos un campo para actualizar.',
    });

export const ContainerImageIdSchema = z.object({
    id: containerImageIdSchema,
});

export type ContainerImage = z.infer<typeof ContainerImageSchema>;
export type CreateContainerImageInput = z.infer<typeof CreateContainerImageSchema>;
export type UpdateContainerImageInput = z.infer<typeof UpdateContainerImageSchema>;
export type ContainerImageIdInput = z.infer<typeof ContainerImageIdSchema>;
