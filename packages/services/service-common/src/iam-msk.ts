import { generateAuthToken } from 'aws-msk-iam-sasl-signer-js';
/**
 * AWS MSK IAM SASL token provider for KafkaJS
 * Generates OAuth bearer tokens for MSK IAM authentication
 */

/**
 * Creates an OAuth bearer token provider for AWS MSK IAM authentication
 * @param region AWS region (e.g., 'us-east-1')
 * @returns Async function that returns { value: token }
 */
export function createMskIamTokenProvider(region: string) {
  return async () => {
    const token = await generateAuthToken({ region });
    return { value: token.token };
  };
}