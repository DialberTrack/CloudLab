export class UserNotFoundError extends Error {
    constructor() {
        super("Usuario no encontrado");
        this.name = "UserNotFoundError";
    }
}

export class UserEmailAlreadyExistsError extends Error {
    constructor() {
        super("El correo electrónico ya está en uso");
        this.name = "UserEmailAlreadyExistsError";
    }
}
