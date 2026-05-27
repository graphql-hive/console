import { createMskIamTokenProvider } from './iam-msk';

vi.mock('aws-msk-iam-sasl-signer-js', () => ({
  generateAuthToken: vi.fn(async () => ({ token: 'abc' })),
}));

test('returns kafkajs-compatible oauth bearer provider', async () => {
  const provider = createMskIamTokenProvider('us-east-1');
  await expect(provider()).resolves.toEqual({ value: 'abc' });
});
