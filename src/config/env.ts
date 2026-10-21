import "dotenv/config";
import type { SignOptions } from "jsonwebtoken";
import z from "zod";

const jwtDurationPattern = /^(\d+(?:\.\d+)?)\s?(ms|s|m|h|d|y)$/;
const durationMultipliers = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    y: 31_557_600_000
} as const;

const jwtDurationSchema = z
    .string()
    .regex(jwtDurationPattern, "La duración JWT debe incluir una unidad, por ejemplo 15m o 7d.")
    .refine(value => {
        const match = jwtDurationPattern.exec(value);
        if (!match) {
            return false;
        }

        const amount = Number(match[1]);
        const unit = match[2] as keyof typeof durationMultipliers;
        const milliseconds = amount * durationMultipliers[unit];
        return milliseconds > 0 && Number.isSafeInteger(milliseconds);
    }, "La duración JWT debe ser positiva y estar dentro de un rango seguro.")
    .transform(value => value as NonNullable<SignOptions["expiresIn"]>);

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"], {
        error: "NODE_ENV debe ser development, production o test."
    }).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8000),
    JWT_SECRET: z.string().min(1, "Se requiere JWT_SECRET."),
    JWT_REFRESH_SECRET: z.string().min(1, "Se requiere JWT_REFRESH_SECRET."),
    JWT_EXPIRES_IN: jwtDurationSchema.default("15m"),
    JWT_REFRESH_EXPIRES_IN: jwtDurationSchema.default("7d")
});

const parsedEnv = envSchema.parse(process.env);
const refreshDuration = String(parsedEnv.JWT_REFRESH_EXPIRES_IN);
const refreshDurationMatch = jwtDurationPattern.exec(refreshDuration);
if (!refreshDurationMatch) {
    throw new Error("La duración del token de renovación no es válida.");
}

const refreshDurationUnit = refreshDurationMatch[2] as keyof typeof durationMultipliers;
export const env = {
    ...parsedEnv,
    JWT_REFRESH_COOKIE_MAX_AGE_MS:
        Number(refreshDurationMatch[1]) * durationMultipliers[refreshDurationUnit]
};
