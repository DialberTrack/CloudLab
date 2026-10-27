export class AppError extends Error {
    public readonly statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this);
    }
}

export class ValidationError extends AppError {
    public issues: unknown;
    constructor(issues: unknown, message: string = 'Error de validación') {
        super(message, 400);
        this.issues = issues;
    }
}
