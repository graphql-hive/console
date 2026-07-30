import * as zod from 'zod';

// Shared helper for optional empty strings
const isNumberString = (input: unknown) => zod.string().regex(/^\d+$/).safeParse(input).success;

const numberFromNumberOrNumberString = (input: unknown): number | undefined => {
  if (typeof input == 'number') return input;
  if (isNumberString(input)) return Number(input);
};

const NumberFromString = zod.preprocess(numberFromNumberOrNumberString, zod.number().min(1));

const emptyString = <T extends zod.ZodType>(input: T) => {
  return zod.preprocess((value: unknown) => {
    if (value === '') return undefined;
    return value;
  }, input);
};

/**
 * Centralized Zod model for Postgres environment variables.
 * Used by all services instead of duplicating the schema.
 */
export const PostgresModel = zod.object({
  POSTGRES_SSL: emptyString(zod.union([zod.literal('1'), zod.literal('0')]).optional()),
  POSTGRES_HOST: zod.string(),
  POSTGRES_PORT: NumberFromString,
  POSTGRES_DB: zod.string(),
  POSTGRES_USER: zod.string(),
  POSTGRES_PASSWORD: emptyString(zod.string().optional()),
  POSTGRES_AWS_REGION: emptyString(zod.string().optional()),
  POSTGRES_AWS_IAM_AUTH_ENABLED: emptyString(
    zod.union([zod.literal('0'), zod.literal('1')]).optional(),
  ),
});

/**
 * Parsed Postgres-related environment variables. Inferred from the Zod schema.
 */
export type PostgresEnvironment = zod.infer<typeof PostgresModel>;

/**
 * Normalized Postgres runtime configuration consumed by service modules.
 */
export type PostgresConfig = {
  host: string;
  port: number;
  db: string;
  user: string;
  password: string | undefined;
  ssl: boolean;
  awsIamAuthEnabled: boolean;
  awsRegion: string | undefined;
};

/**
 * Result of building Postgres runtime config from environment input.
 *
 * `error` is returned for schema validation errors as well as for invalid
 * Postgres IAM combinations (e.g. IAM auth enabled without TLS or region).
 */
export type ParsePostgresConfigFromEnvironmentResult =
  | {
      type: 'error';
      errors: Array<string>;
    }
  | {
      type: 'ok';
      config: PostgresConfig;
    };

/**
 * Parses and validates Postgres environment variables from `process.env`, then
 * validates IAM requirements. Returns a discriminated union of `ok` (with
 * config) or `error` (with messages).
 *
 * @param env - Environment variable bag (typically `process.env`).
 * @param awsRegion - Fallback region used when `POSTGRES_AWS_REGION` is unset
 *   (typically the service's top-level `AWS_REGION`).
 */
export function parsePostgresConfigFromEnvironment(
  env: NodeJS.ProcessEnv,
  awsRegion?: string,
): ParsePostgresConfigFromEnvironmentResult {
  const parseResult = PostgresModel.safeParse(env);

  if (!parseResult.success) {
    return {
      type: 'error',
      errors: [JSON.stringify(parseResult.error.format(), null, 4)],
    };
  }

  const postgres = parseResult.data;

  if (postgres.POSTGRES_AWS_IAM_AUTH_ENABLED === '1') {
    const missingRdsIamVars: string[] = [];

    if (postgres.POSTGRES_SSL !== '1') {
      missingRdsIamVars.push('POSTGRES_SSL must be enabled (RDS IAM requires TLS)');
    }

    if (!postgres.POSTGRES_AWS_REGION && !awsRegion) {
      missingRdsIamVars.push('POSTGRES_AWS_REGION or AWS_REGION');
    }

    if (missingRdsIamVars.length > 0) {
      return {
        type: 'error',
        errors: [
          `POSTGRES_AWS_IAM_AUTH_ENABLED is enabled but the following required variables are missing or invalid: ${missingRdsIamVars.join(', ')}`,
        ],
      };
    }
  }

  return {
    type: 'ok',
    config: {
      host: postgres.POSTGRES_HOST,
      port: postgres.POSTGRES_PORT,
      db: postgres.POSTGRES_DB,
      user: postgres.POSTGRES_USER,
      password: postgres.POSTGRES_PASSWORD,
      ssl: postgres.POSTGRES_SSL === '1',
      awsIamAuthEnabled: postgres.POSTGRES_AWS_IAM_AUTH_ENABLED === '1',
      awsRegion: postgres.POSTGRES_AWS_REGION ?? awsRegion,
    },
  };
}
