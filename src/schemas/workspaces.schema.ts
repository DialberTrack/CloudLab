import * as z from 'zod';

// Esquema de la tabla `workspaces` en la base de datos. No eliminar.
// +--------------------+---------------------------------------------------------+------+-----+---------------------+-------------------------------+
// | Field              | Type                                                    | Null | Key | Default             | Extra                         |
// +--------------------+---------------------------------------------------------+------+-----+---------------------+-------------------------------+
// | id                 | uuid                                                    | NO   | PRI | uuid()              |                               |
// | user_id            | uuid                                                    | NO   | MUL | NULL                |                               |
// | container_image_id | uuid                                                    | NO   | MUL | NULL                |                               |
// | name               | varchar(100)                                            | NO   |     | NULL                |                               |
// | container_id       | varchar(128)                                            | YES  | UNI | NULL                |                               |
// | port               | int(10) unsigned                                        | YES  |     | NULL                |                               |
// | status             | enum('creating','running','stopped','error','deleting') | NO   |     | creating            |                               |
// | vnc_password       | varchar(255)                                            | YES  |     | NULL                |                               |
// | error_message      | text                                                    | YES  |     | NULL                |                               |
// | created_at         | datetime                                                | NO   |     | current_timestamp() |                               |
// | updated_at         | datetime                                                | NO   |     | current_timestamp() | on update current_timestamp() |
// +--------------------+---------------------------------------------------------+------+-----+---------------------+-------------------------------+

const idSchema = z.uuid({ error: 'El ID del workspace debe ser un UUID válido.' });
const userIdSchema = z.uuid({ error: 'El ID del usuario debe ser un UUID válido.' });
const containerImageIdSchema = z.uuid({
    error: 'El ID de la imagen de contenedor debe ser un UUID válido.',
});
const nameSchema = z
    .string({ error: 'El nombre debe ser una cadena de texto.' })
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(100, 'El nombre no puede exceder los 100 caracteres.');
const containerIdSchema = z
    .string({ error: 'El ID del contenedor debe ser una cadena de texto.' })
    .trim()
    .max(128, 'El ID del contenedor no puede exceder los 128 caracteres.')
    .nullish();
const portSchema = z
    .number({ error: 'El puerto debe ser un número.' })
    .int('El puerto debe ser un número entero.')
    .positive('El puerto debe ser un número positivo.')
    .max(65535, 'El puerto no puede exceder el valor máximo de 65535.')
    .nullish();
const statusSchema = z.enum(['creating', 'running', 'stopped', 'error', 'deleting'], {
    error: 'El estado debe ser uno de los siguientes: creating, running, stopped, error, deleting.',
});
const vncPasswordSchema = z
    .string({ error: 'La contraseña VNC debe ser una cadena de texto.' })
    .trim()
    .max(255, 'La contraseña VNC no puede exceder los 255 caracteres.')
    .nullish();
const errorMessageSchema = z
    .string({ error: 'El mensaje de error debe ser una cadena de texto.' })
    .trim()
    .max(65535, 'El mensaje de error no puede exceder los 65535 caracteres.')
    .nullish();
const createdAtSchema = z.date({ error: 'La fecha de creación debe ser una fecha válida.' });
const updatedAtSchema = z.date({ error: 'La fecha de actualización debe ser una fecha válida.' });

const WorkspaceSchema = z.object({
    id: idSchema,
    user_id: userIdSchema,
    container_image_id: containerImageIdSchema,
    name: nameSchema,
    container_id: containerIdSchema,
    port: portSchema,
    status: statusSchema,
    vnc_password: vncPasswordSchema,
    error_message: errorMessageSchema,
    created_at: createdAtSchema,
    updated_at: updatedAtSchema,
});

export const CreateWorkspaceSchema = WorkspaceSchema.pick({
    container_image_id: true,
    name: true,
});

export const WorkspaceIdSchema = z.object({
    id: idSchema,
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
