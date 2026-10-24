import { z } from 'zod';
import 'dotenv/config';

// Expresión regular para validar formatos como "15m", "10h", "7d", "1y"
const jwtExpirationRegex = /^\d+(ms|s|m|h|d|w|y)$/;
const jwtRegexMessage = "Formato de tiempo inválido. Ejemplos válidos: '15m', '2h', '7d'";

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_HOST: z.string().min(1, 'APP_HOST es requerido'),
    APP_PORT: z.coerce.number().int().min(1).max(65535).default(8000),
    DB_HOST: z.string().min(1, 'DB_HOST es requerido'),
    DB_USER: z.string().min(1, 'DB_USER es requerido'),
    DB_PASSWORD: z.string().min(1, 'DB_PASSWORD es requerido'),
    DB_NAME: z.string().min(1, 'DB_NAME es requerido'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET es requerido'),
    JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET es requerido'),

    // Agregamos la validación con regex
    JWT_EXPIRES_IN: z.string().regex(jwtExpirationRegex, jwtRegexMessage).default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().regex(jwtExpirationRegex, jwtRegexMessage).default('7d'),
});

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
    const errors = z.treeifyError(envParsed.error);

    console.error('❌ Error de validación en las variables de entorno:');
    Object.entries(errors.properties ?? {}).forEach(([key, value]) => {
        console.error(`${key} - ${value.errors?.join(', ')}`);
    });
    process.exit(1);
}

export const env = envParsed.data;
