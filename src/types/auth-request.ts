import type { NextFunction, Request, RequestHandler, Response } from 'express';

export type AuthRequest = Request & { user: NonNullable<Request['user']> };

type AuthHandler = (req: AuthRequest, res: Response, next: NextFunction) => unknown;

export const authed =
    (handler: AuthHandler): RequestHandler =>
    (req, res, next) =>
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        handler(req as AuthRequest, res, next);
