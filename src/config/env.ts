import 'dotenv/config';
import z from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"], {
        error: "NODE_ENV debe ser development, production o test."
    }).default("development"),
    PORT: z.number({ error: "PORT debe ser un número." }).default(3000),
    DB_HOST: z.string({ error: "DB_HOST debe ser texto." }).min(1, "Se requiere DB_HOST."),
    DB_PORT: z.number({ error: "DB_PORT debe ser un número." }).default(5432),
    DB_USER: z.string({ error: "DB_USER debe ser texto." }).min(1, "Se requiere DB_USER."),
    DB_PASSWORD: z.string({ error: "DB_PASSWORD debe ser texto." }).min(1, "Se requiere DB_PASSWORD."),
    DB_NAME: z.string({ error: "DB_NAME debe ser texto." }).min(1, "Se requiere DB_NAME."),
    JWT_SECRET: z.string({ error: "JWT_SECRET debe ser texto." }).min(1, "Se requiere JWT_SECRET."),
    JWT_REFRESH_SECRET: z.string({ error: "JWT_REFRESH_SECRET debe ser texto." }).min(1, "Se requiere JWT_REFRESH_SECRET."),
    JWT_EXPIRES_IN: z.string({ error: "JWT_EXPIRES_IN debe ser texto." }).default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string({ error: "JWT_REFRESH_EXPIRES_IN debe ser texto." }).default("7d"),
});

export const env = envSchema.parse(process.env);