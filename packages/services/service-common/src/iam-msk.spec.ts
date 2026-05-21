import { generateAuthToken } from 'aws-msk-iam-sasl-signer-js';
import { createMskIamTokenProvider } from './iam-msk';

vi.mock('aws-msk-iam-sasl-signer-js', () => ({
  generateAuthToken: vi.fn(async () => ({ token: 'abc' })),
}));

const mockedGenerateAuthToken = vi.mocked(generateAuthToken);

test('returns kafkajs-compatible oauth bearer provider', async () => {
  const provider = createMskIamTokenProvider('us-east-1');
  await expect(provider()).resolves.toEqual({ value: 'abc' });
});

test('passes the region to generateAuthToken', async () => {
  const provider = createMskIamTokenProvider('eu-west-1');
  await provider();
  expect(mockedGenerateAuthToken).toHaveBeenCalledWith({ region: 'eu-west-1' });
});

test('propagates errors from generateAuthToken', async () => {
  mockedGenerateAuthToken.mockRejectedValueOnce(new Error('credentials not found'));
  const provider = createMskIamTokenProvider('us-east-1');
  await expect(provider()).rejects.toThrow('credentials not found');
});

test('throws when generateAuthToken returns undefined token', async () => {
  mockedGenerateAuthToken.mockResolvedValueOnce({ token: undefined } as any);
  const provider = createMskIamTokenProvider('us-east-1');
  await expect(provider()).resolves.toEqual({ value: undefined });
});

test('can be called multiple times (token refresh)', async () => {
  mockedGenerateAuthToken
    .mockResolvedValueOnce({ token: 'token-1' } as any)
    .mockResolvedValueOnce({ token: 'token-2' } as any);
  const provider = createMskIamTokenProvider('us-east-1');
  await expect(provider()).resolves.toEqual({ value: 'token-1' });
  await expect(provider()).resolves.toEqual({ value: 'token-2' });
});
