import { Signer } from '@aws-sdk/rds-signer';

/**
 * RDS/Aurora IAM authentication using @aws-sdk/rds-signer.
 *
 * Generates a short-lived auth token (valid 15 minutes) that Aurora
 * accepts as a password.
 *
 * @param config Connection details used to create the RDS IAM auth token.
 * @param config.region AWS region where the Aurora/RDS instance is deployed.
 * @param config.hostname Database hostname.
 * @param config.port Database port.
 * @param config.username Database username for IAM auth.
 * @param logger Logger used to emit debug information during token generation.
 * @returns A signed IAM authentication token that can be used as the database password.
 */

export async function generateRdsIamAuthToken(
  config: {
    region: string;
    hostname: string;
    port: number;
    username: string;
  },
  // Inline logger type to avoid circular dependency on @hive/api's Logger.
  logger: {
    info(msg: string, ...args: any[]): void;
    debug(msg: string, ...args: any[]): void;
    error(msg: string, ...args: any[]): void;
  },
): Promise<string> {
  logger.debug(
    'Generating RDS IAM auth token for %s@%s:%s in %s',
    config.username,
    config.hostname,
    config.port,
    config.region,
  );

  const signer = new Signer({
    region: config.region,
    hostname: config.hostname,
    port: config.port,
    username: config.username,
  });

  const token = await signer.getAuthToken();

  logger.debug('Generated RDS IAM auth token (length=%s)', token.length);
  return token;
}
