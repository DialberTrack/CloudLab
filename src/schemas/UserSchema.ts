import z from "zod";

const UserSchema = z.object({
    id: z.uuid({ error: "El identificador no es válido." }).default(() => crypto.randomUUID()),
    name: z.string({ error: "El nombre debe ser texto." }).min(1, "Se requiere el nombre."),
    email: z.email({ error: "El correo electrónico no es válido." }).min(1, "Se requiere el correo electrónico."),
    password: z.string({ error: "La contraseña debe ser texto." }).min(1, "Se requiere la contraseña."),
    role: z.enum(["admin", "user"], { error: "El rol debe ser administrador o usuario." }).default("user"),
    createdAt: z.date({ error: "La fecha de creación no es válida." }).default(() => new Date()),
    refreshToken: z.string({ error: "El token de renovación debe ser texto." }).optional(),
    active: z.boolean({ error: "El estado de la cuenta debe ser verdadero o falso." }).default(true)
});

export const LoginSchema = UserSchema.pick({
    email: true, password: true
});

export const PasswordChangeSchema = z.object({
    current: z.string({ error: "La contraseña actual debe ser texto." }).min(1, "Se requiere la contraseña actual."),
    password: z.string({ error: "La nueva contraseña debe ser texto." }).min(8, "Se requiere la nueva contraseña de al menos 8 caracteres.")
});

export type User = z.infer<typeof UserSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type PasswordChange = z.infer<typeof PasswordChangeSchema>;