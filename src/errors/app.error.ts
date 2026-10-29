export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code?: string, options?: ErrorOptions) {
        super(message, options);
        this.statusCode = statusCode;
        this.code = code ?? AppError.toCode(new.target.name);

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this);
    }

    private static toCode(errorName: string): string {
        return errorName
            .replace(/Error$/, '')
            .replace(/[A-Z]/g, (letter, index) => (index === 0 ? letter : `_${letter}`))
            .toUpperCase();
    }
}

export class ValidationError extends AppError {
    public issues: unknown;
    constructor(issues: unknown, message: string = 'Error de validación') {
        super(message, 400, 'VALIDATION_ERROR');
        this.issues = issues;
    }
}
