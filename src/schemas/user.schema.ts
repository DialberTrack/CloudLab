import * as z from 'zod';

// Esquema de la tabla `users` en la base de datos. No eliminar.
// +------------+----------------------+------+-----+---------------------+-------------------------------+
// | Field      | Type                 | Null | Key | Default             | Extra                         |
// +------------+----------------------+------+-----+---------------------+-------------------------------+
// | id         | uuid                 | NO   | PRI | uuid()              |                               |
// | name       | varchar(100)         | NO   |     | NULL                |                               |
// | email      | varchar(255)         | NO   | UNI | NULL                |                               |
// | password   | varchar(255)         | NO   |     | NULL                |                               |
// | role       | enum('user','admin') | NO   |     | user                |                               |
// | created_at | timestamp            | NO   |     | current_timestamp() |                               |
// | is_active  | tinyint(1)           | NO   |     | 1                   |                               |
// | updated_at | timestamp            | NO   |     | current_timestamp() | on update current_timestamp() |
// +------------+----------------------+------+-----+---------------------+-------------------------------+

const idSchema = z.uuid({ error: 'El ID del usuario debe ser un UUID válido.' });
const nameSchema = z
    .string({ error: 'El nombre debe ser una cadena de texto.' })
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(100, 'El nombre no puede exceder los 100 caracteres.');
const emailSchema = z
    .string({ error: 'El correo electrónico debe ser una cadena de texto.' })
    .trim()
    .toLowerCase()
    .max(255, 'El correo electrónico no puede exceder los 255 caracteres.')
    .pipe(z.email({ error: 'El correo electrónico no es válido.' }));
const passwordSchema = z
    .string({ error: 'La contraseña debe ser una cadena de texto.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(255, 'La contraseña no puede exceder los 255 caracteres.');
const roleSchema = z.enum(['admin', 'user'], {
    error: 'El rol debe ser «admin» o «user».',
});
const createdAtSchema = z.date({ error: 'La fecha de creación debe ser una fecha válida.' });
const updatedAtSchema = z.date({ error: 'La fecha de actualización debe ser una fecha válida.' });
const activeSchema = z.boolean({ error: 'El estado activo debe ser un valor booleano.' });

const userSchema = z.object({
    id: idSchema,
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: roleSchema,
    created_at: createdAtSchema,
    updated_at: updatedAtSchema,
    is_active: activeSchema,
});

export const CreateUserSchema = userSchema
    .pick({
        name: true,
        email: true,
        password: true,
    })
    .extend({ role: roleSchema.optional() });

export const LoginSchema = userSchema.pick({ email: true, password: true });

export const ChangePasswordSchema = z.object({
    current: passwordSchema,
    password: passwordSchema,
});

export const UpdateUserSchema = userSchema
    .pick({
        name: true,
        email: true,
        role: true,
        is_active: true,
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'Se requiere al menos un campo para actualizar.',
    });

export const UserIdSchema = z.object({
    id: idSchema,
});

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
