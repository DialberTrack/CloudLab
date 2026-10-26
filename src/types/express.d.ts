declare global {
    namespace Express {
        export interface Request {
            user?: {
                id: string;
                role: 'admin' | 'user';
            };
        }
    }
}

export {};
