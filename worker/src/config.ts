type Environment = "dev" | "prd";

export const config = {
  NODE_ENV: (process.env.NODE_ENV ?? "dev") as Environment,
  PORT: Number(process.env.PORT ?? 9999) as number,
  REDIS_URL: process.env.REDIS_URL as string,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD as string,
  DEFAULT_PAYMENT_PROCESSOR_BASE_URL: process.env
    .DEFAULT_PAYMENT_PROCESSOR_BASE_URL as string,
  FALLBACK_PAYMENT_PROCESSOR_BASE_URL: process.env
    .FALLBACK_PAYMENT_PROCESSOR_BASE_URL as string,
};
