import { styleText } from 'node:util';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogFormat = 'text' | 'json';
type LogContext = Record<string, unknown>;

const levels: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const configuredLevel = process.env.LOG_LEVEL as LogLevel | undefined;
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const configuredFormat = process.env.LOG_FORMAT as LogFormat | undefined;
const minimumLevel = configuredLevel && configuredLevel in levels ? configuredLevel : 'info';
const format = configuredFormat === 'json' ? configuredFormat : 'text';
const levelStyles: Record<LogLevel, Parameters<typeof styleText>[0]> = {
    debug: 'gray',
    info: 'green',
    warn: 'yellow',
    error: 'red',
};
const timestampStyle: Parameters<typeof styleText>[0] = 'yellow';

const serializeContext = (context: LogContext | undefined): string => {
    if (!context || Object.keys(context).length === 0) {
        return '';
    }

    return ` ${JSON.stringify(context, (_key, value: unknown) =>
        value instanceof Error
            ? { name: value.name, message: value.message, stack: value.stack }
            : value
    )}`;
};

const write = (level: LogLevel, message: string, context?: LogContext): void => {
    if (levels[level] < levels[minimumLevel]) {
        return;
    }

    const timestamp = new Date().toISOString();
    const output =
        format === 'json'
            ? JSON.stringify(
                  {
                      timestamp,
                      level,
                      message,
                      ...(context && Object.keys(context).length > 0 ? { context } : {}),
                  },
                  (_key, value: unknown) =>
                      value instanceof Error
                          ? { name: value.name, message: value.message, stack: value.stack }
                          : value
              )
            : `${styleText(timestampStyle, `[${timestamp}]`)} ${styleText(levelStyles[level], level.toUpperCase())} ${message}${serializeContext(context)}`;

    console[level](output);
};

export const logger = {
    debug: (message: string, context?: LogContext): void => write('debug', message, context),
    info: (message: string, context?: LogContext): void => write('info', message, context),
    warn: (message: string, context?: LogContext): void => write('warn', message, context),
    error: (message: string, context?: LogContext): void => write('error', message, context),
};
