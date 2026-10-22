import z from 'zod';

export const WorkspaceStatusSchema = z.enum([
    'created',
    'running',
    'paused',
    'restarting',
    'removing',
    'exited',
    'dead',
    'unknown',
]);

export const WorkspaceSchema = z.object({
    id: z.uuid({ error: 'El identificador del workspace no es válido.' }),
    user_id: z.uuid({ error: 'El identificador del usuario no es válido.' }),
    catalog_id: z.uuid({ error: 'El identificador de la imagen no es válido.' }),
    container_id: z.string().trim().min(1, 'Se requiere el identificador del contenedor.'),
    port: z.number().int().min(1).max(65535).nullable(),
    status: WorkspaceStatusSchema,
    created_at: z.iso.datetime({ error: 'La fecha de creación no es válida.' }),
    vnc_password: z.string().min(1, 'Se requiere la contraseña de VNC.'),
});

export const CreateWorkspaceSchema = z.object({
    catalog_id: z.uuid({ error: 'El identificador de la imagen no es válido.' }),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type WorkspaceStatus = z.infer<typeof WorkspaceStatusSchema>;
export type WorkspaceListItem = Omit<Workspace, 'vnc_password'>;
export type CreateWorkspace = z.infer<typeof CreateWorkspaceSchema>;
