// apps/backend/src/core/utils/logger.ts

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const metaString = meta
      ? `\n\x1b[90m${JSON.stringify(meta, null, 2)}\x1b[0m`
      : '';
    console.log(`\x1b[36m[INFO]\x1b[0m [${timestamp}] ${message}${metaString}`);
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const metaString = meta
      ? `\n\x1b[90m${JSON.stringify(meta, null, 2)}\x1b[0m`
      : '';
    console.warn(
      `\x1b[33m[WARN]\x1b[0m [${timestamp}] ${message}${metaString}`
    );
  },

  error: (message: string, error?: unknown) => {
    const timestamp = new Date().toISOString();
    console.error(`\x1b[31m[ERROR]\x1b[0m [${timestamp}] ${message}`);

    if (error instanceof Error) {
      console.error(`\x1b[31m${error.stack}\x1b[0m`);
    } else if (error) {
      console.error(`\x1b[31m${JSON.stringify(error, null, 2)}\x1b[0m`);
    }
  }
};
