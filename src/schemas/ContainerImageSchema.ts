import z from 'zod';

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|svg)$/i;

const iconUrlSchema = z
    .string({ error: 'El url del icono debe ser una URL válida.' })
    .trim()
    .pipe(z.url({ error: 'El url del icono debe ser una URL válida.' }))
    .refine((url) => IMAGE_EXTENSIONS.test(url), {
        error: 'El url del icono debe ser una URL válida.',
    })
    .optional();

const nameSchema = z
    .string({ error: 'El nombre debe ser texto.' })
    .trim()
    .min(3, 'Se requiere un nombre de al menos 3 caracteres.');

const descriptionSchema = z
    .string({ error: 'La descripción debe ser texto.' })
    .trim()
    .min(10, 'Se requiere una descripción de al menos 10 caracteres.')
    .optional();
const imageReferenceSchema = z
    .string({ error: 'La referencia de la imagen debe ser texto.' })
    .trim()
    .min(3, 'Se requiere una referencia de la imagen de al menos 3 caracteres.');
export const ContainerImageSchema = z.object({
    id: z.uuid({ error: 'El identificador no es válido.' }).default(() => crypto.randomUUID()),
    name: nameSchema,
    description: descriptionSchema,
    imageReference: imageReferenceSchema,
    iconUrl: iconUrlSchema,
    createdAt: z.iso
        .datetime({ error: 'La fecha de creación no es válida.' })
        .default(() => new Date().toISOString()),
});

export const CreateContainerImageSchema = ContainerImageSchema.omit({
    id: true,
    createdAt: true,
});

export const EditContainerImageSchema = z
    .object({
        name: nameSchema.optional(),
        imageReference: imageReferenceSchema.optional(),
        iconUrl: iconUrlSchema.optional(),
        description: descriptionSchema.optional(),
    })
    .refine((updates) => Object.keys(updates).length > 0, {
        error: 'Se requiere al menos un campo para actualizar.',
    });

export type ContainerImage = z.infer<typeof ContainerImageSchema>;
export type EditContainerImage = z.infer<typeof EditContainerImageSchema>;
