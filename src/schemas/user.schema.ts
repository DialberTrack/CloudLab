import z from 'zod';

// Database schema for the users table:
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

const userIdSchema = z.uuid({ error: 'El ID de usuario debe ser un UUID válido.' });
const nameSchema = z
    .string({ error: 'El nombre debe ser texto.' })
    .trim()
    .min(3, 'Se requiere un nombre de al menos 3 caracteres.')
    .max(100, 'El nombre no puede exceder los 100 caracteres.');
const emailSchema = z
    .string({ error: 'El correo electrónico debe ser texto.' })
    .trim()
    .toLowerCase()
    .max(255, 'El correo electrónico no puede exceder los 255 caracteres.')
    .pipe(z.email({ error: 'El correo electrónico no es válido.' }));
const passwordSchema = z
    .string({ error: 'La contraseña debe ser texto.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(255, 'La contraseña no puede exceder los 255 caracteres.');
const createdAtSchema = z.date({ error: 'La fecha de creación debe ser una fecha válida.' });
const updatedAtSchema = z.date({ error: 'La fecha de actualización debe ser una fecha válida.' });
const roleSchema = z.enum(['admin', 'user'], {
    error: 'El rol debe ser administrador o usuario.',
});
const activeSchema = z.boolean({ error: 'El estado activo debe ser un valor booleano.' });

const UserSchema = z.object({
    id: userIdSchema,
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: roleSchema,
    createdAt: createdAtSchema,
    updatedAt: updatedAtSchema,
    is_active: activeSchema,
});

export const CreateUserSchema = UserSchema.pick({
    name: true,
    email: true,
    password: true,
}).extend({ role: roleSchema.optional() });

export const LoginSchema = UserSchema.pick({ email: true, password: true });

export const ChangePasswordSchema = z.object({
    current: passwordSchema,
    password: passwordSchema,
});

export const UpdateUserSchema = UserSchema.pick({
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
    id: userIdSchema,
});

export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type UserIdInput = z.infer<typeof UserIdSchema>;
