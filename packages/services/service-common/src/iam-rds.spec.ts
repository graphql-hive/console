import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

const mockGetAuthToken = vi.fn();

vi.mock('@aws-sdk/rds-signer', () => ({
  Signer: vi.fn().mockImplementation(function (this: any, config: any) {
    this.getAuthToken = mockGetAuthToken;
    this._config = config;
  }),
}));

beforeEach(() => {
  mockGetAuthToken.mockReset();
});

describe('generateRdsIamAuthToken', () => {
  describe('happy path', () => {
    it('returns a valid auth token from the RDS Signer', async () => {
      mockGetAuthToken.mockResolvedValue(
        'my-host.us-east-1.rds.amazonaws.com:5432/?Action=connect&DBUser=appuser&X-Amz-Token=abc123',
      );

      const { generateRdsIamAuthToken } = await import('./iam-rds');
      const logger = createMockLogger();

      const token = await generateRdsIamAuthToken(
        {
          region: 'us-east-1',
          hostname: 'my-host.us-east-1.rds.amazonaws.com',
          port: 5432,
          username: 'appuser',
        },
        logger,
      );

      expect(token).toBe(
        'my-host.us-east-1.rds.amazonaws.com:5432/?Action=connect&DBUser=appuser&X-Amz-Token=abc123',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Generating RDS IAM auth token'),
        'appuser',
        'my-host.us-east-1.rds.amazonaws.com',
        5432,
        'us-east-1',
      );
    });

    it('constructs Signer with correct configuration', async () => {
      mockGetAuthToken.mockResolvedValue('token-value');

      const { Signer } = await import('@aws-sdk/rds-signer');
      const { generateRdsIamAuthToken } = await import('./iam-rds');
      const logger = createMockLogger();

      await generateRdsIamAuthToken(
        {
          region: 'eu-west-1',
          hostname: 'aurora-cluster.eu-west-1.rds.amazonaws.com',
          port: 5432,
          username: 'iamuser',
        },
        logger,
      );

      expect(Signer).toHaveBeenCalledWith({
        region: 'eu-west-1',
        hostname: 'aurora-cluster.eu-west-1.rds.amazonaws.com',
        port: 5432,
        username: 'iamuser',
      });
    });

    it('logs token length on success', async () => {
      const fakeToken = 'x'.repeat(1812);
      mockGetAuthToken.mockResolvedValue(fakeToken);

      const { generateRdsIamAuthToken } = await import('./iam-rds');
      const logger = createMockLogger();

      await generateRdsIamAuthToken(
        {
          region: 'us-east-1',
          hostname: 'host.rds.amazonaws.com',
          port: 5432,
          username: 'user',
        },
        logger,
      );

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Generated RDS IAM auth token'),
        1812,
      );
    });
  });

  describe('Signer errors', () => {
    it('propagates credential provider errors', async () => {
      mockGetAuthToken.mockRejectedValue(new Error('CredentialsProviderError: no credentials'));

      const { generateRdsIamAuthToken } = await import('./iam-rds');
      const logger = createMockLogger();

      await expect(
        generateRdsIamAuthToken(
          {
            region: 'us-east-1',
            hostname: 'host.rds.amazonaws.com',
            port: 5432,
            username: 'user',
          },
          logger,
        ),
      ).rejects.toThrow('CredentialsProviderError: no credentials');
    });

    it('propagates network/timeout errors from Signer', async () => {
      mockGetAuthToken.mockRejectedValue(new Error('TimeoutError: connection timed out'));

      const { generateRdsIamAuthToken } = await import('./iam-rds');
      const logger = createMockLogger();

      await expect(
        generateRdsIamAuthToken(
          {
            region: 'us-east-1',
            hostname: 'host.rds.amazonaws.com',
            port: 5432,
            username: 'user',
          },
          logger,
        ),
      ).rejects.toThrow('TimeoutError: connection timed out');
    });
  });
});
