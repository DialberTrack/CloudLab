import z from 'zod';

const nameSchema = z
    .string({ error: 'El nombre debe ser texto.' })
    .trim()
    .min(3, 'Se requiere un nombre de al menos 3 caracteres.');

const emailSchema = z
    .string({ error: 'El correo electrónico debe ser texto.' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'El correo electrónico no es válido.' }));

const roleSchema = z.enum(['admin', 'user'], {
    error: 'El rol debe ser administrador o usuario.',
});

const activeSchema = z.boolean({ error: 'El estado de la cuenta debe ser verdadero o falso.' });

const UserSchema = z.object({
    id: z.uuid({ error: 'El identificador no es válido.' }).default(() => crypto.randomUUID()),
    name: nameSchema,
    email: emailSchema,
    password: z
        .string({ error: 'La contraseña debe ser texto.' })
        .min(8, 'Se requiere la contraseña de al menos 8 caracteres.'),
    role: roleSchema.default('user'),
    createdAt: z.iso
        .datetime({ error: 'La fecha de creación no es válida.' })
        .default(() => new Date().toISOString()),
    refreshToken: z.string({ error: 'El token de renovación debe ser texto.' }).optional(),
    active: activeSchema.default(true),
});

export const LoginSchema = UserSchema.pick({
    email: true,
    password: true,
});

export const ChangePasswordSchema = z.object({
    current: z
        .string({ error: 'La contraseña actual debe ser texto.' })
        .min(8, 'Se requiere la contraseña actual.'),
    password: z
        .string({ error: 'La nueva contraseña debe ser texto.' })
        .min(8, 'Se requiere la nueva contraseña de al menos 8 caracteres.'),
});

export const CreateUserSchema = UserSchema.pick({
    name: true,
    email: true,
    password: true,
    role: true,
});

export const EditUserSchema = z
    .object({
        name: nameSchema.optional(),
        email: emailSchema.optional(),
        role: roleSchema.optional(),
        active: activeSchema.optional(),
    })
    .refine((updates) => Object.keys(updates).length > 0, {
        error: 'Se requiere al menos un campo para actualizar.',
    });

export type User = z.infer<typeof UserSchema>;
export type EditUser = z.infer<typeof EditUserSchema>;
