// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, test, vi } from 'vitest';
import { AwsClient, type S3CredentialProvider } from '../src/aws';

describe('S3 IAM AwsClient (cdn-worker)', () => {
  describe('constructor', () => {
    test('wraps static S3 credentials in a credential provider', async () => {
      const client = new AwsClient({
        accessKeyId: 'STATIC_AKID',
        secretAccessKey: 'STATIC_SECRET',
        sessionToken: 'STATIC_TOKEN',
        service: 's3',
        region: 'us-east-1',
      });

      const provider = (client as any).credentialProvider as S3CredentialProvider;
      const creds = await provider.getCredentials();

      expect(creds).toEqual({
        accessKeyId: 'STATIC_AKID',
        secretAccessKey: 'STATIC_SECRET',
        sessionToken: 'STATIC_TOKEN',
      });
    });

    test('uses credentialProvider directly when provided', async () => {
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockResolvedValue({
          accessKeyId: 'IAM_AKID',
          secretAccessKey: 'IAM_SECRET',
          sessionToken: 'IAM_TOKEN',
        }),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'us-east-1',
      });

      const provider = (client as any).credentialProvider as S3CredentialProvider;
      expect(provider).toBe(mockProvider);

      const creds = await provider.getCredentials();
      expect(creds.accessKeyId).toBe('IAM_AKID');
    });

    test('static creds without sessionToken omits it', async () => {
      const client = new AwsClient({
        accessKeyId: 'AKID',
        secretAccessKey: 'SECRET',
        service: 's3',
        region: 'us-east-1',
      });

      const provider = (client as any).credentialProvider as S3CredentialProvider;
      const creds = await provider.getCredentials();

      expect(creds.accessKeyId).toBe('AKID');
      expect(creds.secretAccessKey).toBe('SECRET');
      expect(creds.sessionToken).toBeUndefined();
    });
  });

  describe('sign()', () => {
    test('resolves credentials from provider before signing S3 requests', async () => {
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockResolvedValue({
          accessKeyId: 'SIGN_AKID',
          secretAccessKey: 'SIGN_SECRET',
        }),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'us-east-1',
      });

      const [url, signed] = await client.sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
        method: 'GET',
      });

      expect(mockProvider.getCredentials).toHaveBeenCalledOnce();
      expect(url).toBe('https://s3.us-east-1.amazonaws.com/bucket/key');
      const authHeader = (signed.headers as Headers).get('authorization');
      expect(authHeader).toContain('SIGN_AKID');
      expect(authHeader).toContain('AWS4-HMAC-SHA256');
    });

    test('uses refreshed credentials on successive S3 calls', async () => {
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

      const [, signed1] = await client.sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
        method: 'GET',
      });
      const [, signed2] = await client.sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
        method: 'GET',
      });

      const auth1 = (signed1.headers as Headers).get('authorization');
      const auth2 = (signed2.headers as Headers).get('authorization');

      expect(auth1).toContain('KEY_1');
      expect(auth2).toContain('KEY_2');
    });

    test('includes x-amz-security-token for IAM temporary credentials', async () => {
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockResolvedValue({
          accessKeyId: 'AKID',
          secretAccessKey: 'SECRET',
          sessionToken: 'SESSION_TOK',
        }),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'us-east-1',
      });

      const [, signed] = await client.sign('https://s3.us-east-1.amazonaws.com/bucket/key', {
        method: 'GET',
      });

      const tokenHeader = (signed.headers as Headers).get('x-amz-security-token');
      expect(tokenHeader).toBe('SESSION_TOK');
    });

    test('throws when provider returns credentials missing accessKeyId', async () => {
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
        client.sign('https://s3.us-east-1.amazonaws.com/bucket/key', { method: 'GET' }),
      ).rejects.toThrow('accessKeyId is a required option');
    });

    test('throws when provider returns credentials missing secretAccessKey', async () => {
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
        client.sign('https://s3.us-east-1.amazonaws.com/bucket/key', { method: 'GET' }),
      ).rejects.toThrow('secretAccessKey is a required option');
    });

    test('rejects when credential provider throws', async () => {
      const mockProvider: S3CredentialProvider = {
        getCredentials: vi.fn().mockRejectedValue(new Error('Pod Identity unavailable')),
      };

      const client = new AwsClient({
        credentialProvider: mockProvider,
        service: 's3',
        region: 'us-east-1',
      });

      await expect(
        client.sign('https://s3.us-east-1.amazonaws.com/bucket/key', { method: 'GET' }),
      ).rejects.toThrow('Pod Identity unavailable');
    });
  });
});
