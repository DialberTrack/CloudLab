import type { RequestHandler } from 'express';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

/** Crea un middleware para manejar métodos no permitidos. */
export const methodNotAllowed = (allowedMethods: HttpMethod[]): RequestHandler => {
    return (req, res) => {
        const allowedMethodsHeader = allowedMethods.join(', ');

        res.status(405)
            .set('Allow', allowedMethodsHeader)
            .json({
                error: `Method ${req.method} Not Allowed.`,
                message: `Allowed methods: ${allowedMethodsHeader}`,
            });
    };
};
