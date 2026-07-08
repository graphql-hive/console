// eslint-disable-next-line import/no-extraneous-dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AwsClient, createDefaultCredentialProvider, type S3CredentialProvider } from './aws';

const { mockFromNodeProviderChain } = vi.hoisted(() => ({
  mockFromNodeProviderChain: vi.fn(),
}));
vi.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: mockFromNodeProviderChain,
}));

function createMockLogger() {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  };
}

describe('createDefaultCredentialProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('static credentials (IAM disabled)', () => {
    it('returns static credentials with session token', async () => {
      const provider = createDefaultCredentialProvider({
        awsIamAuthEnabled: false,
        staticCredentials: {
          accessKeyId: 'AKID',
          secretAccessKey: 'SECRET',
          sessionToken: 'TOKEN',
        },
      });

      const creds = await provider.getCredentials();
      expect(creds).toEqual({
        accessKeyId: 'AKID',
        secretAccessKey: 'SECRET',
        sessionToken: 'TOKEN',
      });
    });

    it('returns static credentials without session token', async () => {
      const provider = createDefaultCredentialProvider({
        awsIamAuthEnabled: false,
        staticCredentials: {
          accessKeyId: 'AKID',
          secretAccessKey: 'SECRET',
        },
      });

      const creds = await provider.getCredentials();
      expect(creds).toEqual({
        accessKeyId: 'AKID',
        secretAccessKey: 'SECRET',
        sessionToken: undefined,
      });
    });
  });

  describe('IAM credential chain (IAM enabled)', () => {
    it('delegates to the SDK credential chain', async () => {
      const sdkProvider = vi.fn().mockResolvedValue({
        accessKeyId: 'IAM_AKID',
        secretAccessKey: 'IAM_SECRET',
        sessionToken: 'IAM_TOKEN',
      });
      mockFromNodeProviderChain.mockReturnValue(sdkProvider);

      const provider = createDefaultCredentialProvider({
        awsIamAuthEnabled: true,
      });

      const creds = await provider.getCredentials();
      expect(mockFromNodeProviderChain).toHaveBeenCalled();
      expect(creds).toEqual({
        accessKeyId: 'IAM_AKID',
        secretAccessKey: 'IAM_SECRET',
        sessionToken: 'IAM_TOKEN',
      });
    });

    it('ignores static credentials when awsIamAuthEnabled is true', async () => {
      const sdkProvider = vi.fn().mockResolvedValue({
        accessKeyId: 'IAM_AKID',
        secretAccessKey: 'IAM_SECRET',
      });
      mockFromNodeProviderChain.mockReturnValue(sdkProvider);

      const provider = createDefaultCredentialProvider({
        awsIamAuthEnabled: true,
        staticCredentials: {
          accessKeyId: 'STATIC_AKID',
          secretAccessKey: 'STATIC_SECRET',
        },
      });

      const creds = await provider.getCredentials();
      expect(creds.accessKeyId).toBe('IAM_AKID');
    });

    it('calls the SDK provider on every getCredentials() invocation', async () => {
      let callCount = 0;
      const sdkProvider = vi.fn().mockImplementation(async () => {
        callCount++;
        return {
          accessKeyId: `AKID_${callCount}`,
          secretAccessKey: `SECRET_${callCount}`,
        };
      });
      mockFromNodeProviderChain.mockReturnValue(sdkProvider);

      const provider = createDefaultCredentialProvider({ awsIamAuthEnabled: true });

      const first = await provider.getCredentials();
      const second = await provider.getCredentials();

      expect(first.accessKeyId).toBe('AKID_1');
      expect(second.accessKeyId).toBe('AKID_2');
      expect(sdkProvider).toHaveBeenCalledTimes(2);
    });
  });

  describe('validation errors', () => {
    it('throws when no credentials and IAM disabled', () => {
      expect(() =>
        createDefaultCredentialProvider({
          awsIamAuthEnabled: false,
        }),
      ).toThrow('No AWS credentials available');
    });

    it('throws when called with no options', () => {
      expect(() => createDefaultCredentialProvider()).toThrow('No AWS credentials available');
    });

    it('throws when accessKeyId is an empty string', () => {
      expect(() =>
        createDefaultCredentialProvider({
          awsIamAuthEnabled: false,
          staticCredentials: {
            accessKeyId: '',
            secretAccessKey: 'SECRET',
          },
        }),
      ).toThrow('No AWS credentials available');
    });

    it('throws when accessKeyId is undefined', () => {
      expect(() =>
        createDefaultCredentialProvider({
          awsIamAuthEnabled: false,
          staticCredentials: {
            accessKeyId: undefined,
            secretAccessKey: 'SECRET',
          },
        }),
      ).toThrow('No AWS credentials available');
    });

    it('throws when secretAccessKey is an empty string', () => {
      expect(() =>
        createDefaultCredentialProvider({
          awsIamAuthEnabled: false,
          staticCredentials: {
            accessKeyId: 'AKID',
            secretAccessKey: '',
          },
        }),
      ).toThrow('No AWS credentials available');
    });
  });

  describe('error propagation', () => {
    it('propagates SDK provider rejection', async () => {
      const sdkProvider = vi.fn().mockRejectedValue(new Error('IMDS timeout'));
      mockFromNodeProviderChain.mockReturnValue(sdkProvider);

      const provider = createDefaultCredentialProvider({ awsIamAuthEnabled: true });

      await expect(provider.getCredentials()).rejects.toThrow('IMDS timeout');
    });
  });

  describe('logging', () => {
    it('logs info when using IAM auth', () => {
      const logger = createMockLogger();
      const sdkProvider = vi.fn().mockResolvedValue({
        accessKeyId: 'X',
        secretAccessKey: 'Y',
      });
      mockFromNodeProviderChain.mockReturnValue(sdkProvider);

      createDefaultCredentialProvider({ awsIamAuthEnabled: true, logger });

      expect(logger.info).toHaveBeenCalledWith(
        'Using AWS SDK default credential chain (IAM auth enabled)',
      );
    });

    it('logs info when using static credentials', () => {
      const logger = createMockLogger();
      createDefaultCredentialProvider({
        awsIamAuthEnabled: false,
        staticCredentials: { accessKeyId: 'A', secretAccessKey: 'B' },
        logger,
      });

      expect(logger.info).toHaveBeenCalledWith('Using static AWS credentials');
    });

    it('logs debug with expiration when SDK returns one', async () => {
      const expiration = new Date('2026-06-01T00:00:00Z');
      const sdkProvider = vi.fn().mockResolvedValue({
        accessKeyId: 'X',
        secretAccessKey: 'Y',
        sessionToken: 'Z',
        expiration,
      });
      mockFromNodeProviderChain.mockReturnValue(sdkProvider);
      const logger = createMockLogger();

      const provider = createDefaultCredentialProvider({ awsIamAuthEnabled: true, logger });
      await provider.getCredentials();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('2026-06-01T00:00:00.000Z'),
      );
    });

    it('logs debug without expiration when SDK omits it', async () => {
      const sdkProvider = vi.fn().mockResolvedValue({
        accessKeyId: 'X',
        secretAccessKey: 'Y',
      });
      mockFromNodeProviderChain.mockReturnValue(sdkProvider);
      const logger = createMockLogger();

      const provider = createDefaultCredentialProvider({ awsIamAuthEnabled: true, logger });
      await provider.getCredentials();

      expect(logger.debug).toHaveBeenCalledWith('Credentials resolved');
    });
  });
});

describe('AwsClient signing', () => {
  describe('happy path', () => {
    it('resolves credentials from the provider and signs the request', async () => {
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockResolvedValue({
          accessKeyId: 'TEST_AKID',
          secretAccessKey: 'TEST_SECRET',
          sessionToken: undefined,
        }),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'us-east-1',
      });

      const signed = await (client as any).sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
        method: 'GET',
        headers: {},
      });

      expect(mockProvider.getCredentials).toHaveBeenCalledOnce();
      expect(signed.init.headers['authorization']).toContain('TEST_AKID');
      expect(signed.init.headers['authorization']).toContain('AWS4-HMAC-SHA256');
    });

    it('fetches fresh credentials on each sign() call', async () => {
      let callCount = 0;
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockImplementation(async () => {
          callCount++;
          return {
            accessKeyId: `KEY_${callCount}`,
            secretAccessKey: 'SECRET',
          };
        }),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'us-east-1',
      });

      const signed1 = await (client as any).sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
        method: 'GET',
        headers: {},
      });
      const signed2 = await (client as any).sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
        method: 'PUT',
        headers: {},
        body: 'artifact-content',
      });

      expect(signed1.init.headers['authorization']).toContain('KEY_1');
      expect(signed2.init.headers['authorization']).toContain('KEY_2');
    });

    it('includes x-amz-security-token for temporary credentials', async () => {
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockResolvedValue({
          accessKeyId: 'AKID',
          secretAccessKey: 'SECRET',
          sessionToken: 'MY_SESSION_TOKEN',
        }),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'us-east-1',
      });

      const signed = await (client as any).sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
        method: 'GET',
        headers: {},
      });

      expect(signed.init.headers['x-amz-security-token']).toBe('MY_SESSION_TOKEN');
    });

    it('sets x-amz-content-sha256 to UNSIGNED-PAYLOAD', async () => {
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockResolvedValue({
          accessKeyId: 'AKID',
          secretAccessKey: 'SECRET',
        }),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'us-east-1',
      });

      const signed = await (client as any).sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
        method: 'PUT',
        headers: {},
        body: 'artifact-data',
      });

      expect(signed.init.headers['x-amz-content-sha256']).toBe('UNSIGNED-PAYLOAD');
    });

    it('produces correct credential scope with the configured region', async () => {
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockResolvedValue({
          accessKeyId: 'AKID',
          secretAccessKey: 'SECRET',
        }),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'eu-west-1',
      });

      const signed = await (client as any).sign('https://s3.eu-west-1.amazonaws.com/bucket/key', {
        method: 'GET',
        headers: {},
      });

      expect(signed.init.headers['authorization']).toContain('eu-west-1/s3/aws4_request');
    });
  });

  describe('error handling', () => {
    it('throws when provider returns null accessKeyId', async () => {
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockResolvedValue({
          accessKeyId: null,
          secretAccessKey: 'SECRET',
        }),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'us-east-1',
      });

      await expect(
        (client as any).sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
          method: 'GET',
          headers: {},
        }),
      ).rejects.toThrow('accessKeyId is a required option');
    });

    it('throws when provider returns null secretAccessKey', async () => {
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockResolvedValue({
          accessKeyId: 'AKID',
          secretAccessKey: null,
        }),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'us-east-1',
      });

      await expect(
        (client as any).sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
          method: 'GET',
          headers: {},
        }),
      ).rejects.toThrow('secretAccessKey is a required option');
    });

    it('propagates credential provider rejection', async () => {
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockRejectedValue(new Error('Pod Identity unavailable')),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'us-east-1',
      });

      await expect(
        (client as any).sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
          method: 'GET',
          headers: {},
        }),
      ).rejects.toThrow('Pod Identity unavailable');
    });
  });
});
