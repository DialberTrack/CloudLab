import type { RequestHandler } from 'express';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export const methodNotAllowed = (allowedMethods: HttpMethod[]): RequestHandler => {
    return (req, res) => {
        const allowedMethodsString = allowedMethods.join(', ');

        res.status(405)
            .set('Allow', allowedMethodsString)
            .json({
                error: `Method ${req.method} Not Allowed.`,
                message: `Allowed methods: ${allowedMethodsString}`,
            });
    };
};
