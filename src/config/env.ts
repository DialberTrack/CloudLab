import 'dotenv/config';
import * as z from 'zod';
import { logger } from '../utils/logger.js';

const jwtExpirationRegex = /^\d+(ms|s|m|h|d|w|y)$/;
const jwtRegexMessage = "Formato de tiempo inválido. Ejemplos válidos: '15m', '2h', '7d'";

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    LOG_FORMAT: z.enum(['text', 'json']).default('text'),

    APP_HOST: z.string().min(1, 'APP_HOST es requerido'),
    APP_PORT: z.coerce.number().int().min(1).max(65535).default(8000),
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),

    DB_HOST: z.string().min(1, 'DB_HOST es requerido'),
    DB_USER: z.string().min(1, 'DB_USER es requerido'),
    DB_PASSWORD: z.string().min(1, 'DB_PASSWORD es requerido'),
    DB_NAME: z.string().min(1, 'DB_NAME es requerido'),

    JWT_SECRET: z.string().min(1, 'JWT_SECRET es requerido'),
    JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET es requerido'),
    MAX_REFRESH_TOKENS_PER_USER: z.coerce.number().int().min(1).default(5),

    JWT_EXPIRES_IN: z.string().regex(jwtExpirationRegex, jwtRegexMessage).default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().regex(jwtExpirationRegex, jwtRegexMessage).default('7d'),
});

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
    const errors = z.treeifyError(envParsed.error);

    logger.error('Error de validación en las variables de entorno');
    Object.entries(errors.properties ?? {}).forEach(([key, value]) => {
        logger.error(`${key} - ${value.errors?.join(', ')}`);
    });
    process.exit(1);
}

const refreshExpirationMatch =
    envParsed.data.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)(ms|s|m|h|d|w|y)$/);

if (!refreshExpirationMatch) {
    throw new Error(jwtRegexMessage);
}

const [, amount, unit] = refreshExpirationMatch;
if (!amount || !unit) {
    throw new Error(jwtRegexMessage);
}

const millisecondsByUnit: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
    y: 31_536_000_000,
};

const millisecondsPerSelectedUnit = millisecondsByUnit[unit];
if (millisecondsPerSelectedUnit === undefined) {
    throw new Error(jwtRegexMessage);
}

const refreshTokenDurationMs = Number(amount) * millisecondsPerSelectedUnit;

export const env = {
    ...envParsed.data,
    JWT_REFRESH_COOKIE_MAX_AGE_MS: refreshTokenDurationMs,
};
