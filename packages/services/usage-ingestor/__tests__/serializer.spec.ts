import type { ProcessedOperationErrorRecord } from '@hive/usage-common';
import {
  serializeAppDeploymentUsageRowBinary,
  serializeOperationErrorsRowBinary,
  serializeOperationsRowBinary,
  serializeRegistryRecordsRowBinary,
  serializeSubscriptionOperationsRowBinary,
} from '../src/serializer';

const timestamp = {
  asNumber: 1_643_892_203_027,
};

const expiresAt = {
  asNumber: 1_643_892_206_037,
};

test('serialize all usage records with RowBinary using ClickHouse type encodings', () => {
  const operationBinary = Buffer.concat([
    ...serializeOperationsRowBinary([
      {
        target: 'my-target',
        organization: 'my-organization',
        timestamp: timestamp.asNumber,
        expiresAt: expiresAt.asNumber,
        operationHash: 'my-hash',
        execution: {
          ok: true,
          errorsTotal: 2,
          duration: 230,
          coordinateTotals: { 'Query.foo': 3 },
        },
        metadata: { client: { name: 'client', version: '1.0.0' } },
      },
    ]),
  ]);
  const operationOffset = { value: 0 };
  expect(readString(operationBinary, operationOffset)).toBe('my-organization');
  expect(readString(operationBinary, operationOffset)).toBe('my-target');
  expect(readUInt32(operationBinary, operationOffset)).toBe(1_643_892_203);
  expect(readUInt32(operationBinary, operationOffset)).toBe(1_643_892_206);
  expect(readString(operationBinary, operationOffset)).toBe('my-hash');
  expect(operationBinary.readUInt8(operationOffset.value++)).toBe(1);
  expect(operationBinary.readUInt16LE(operationOffset.value)).toBe(2);
  operationOffset.value += 2;
  expect(operationBinary.readBigUInt64LE(operationOffset.value)).toBe(230n);
  operationOffset.value += 8;
  expect(readString(operationBinary, operationOffset)).toBe('client');
  expect(readString(operationBinary, operationOffset)).toBe('1.0.0');
  expect(readVarUInt(operationBinary, operationOffset)).toBe(1);
  expect(readString(operationBinary, operationOffset)).toBe('Query.foo');
  expect(readUInt32(operationBinary, operationOffset)).toBe(3);
  expect(operationOffset.value).toBe(operationBinary.length);

  const subscriptionBinary = Buffer.concat([
    ...serializeSubscriptionOperationsRowBinary([
      {
        target: 'my-target',
        organization: 'my-organization',
        timestamp: timestamp.asNumber,
        expiresAt: expiresAt.asNumber,
        operationHash: 'my-hash',
      },
    ]),
  ]);
  const subscriptionOffset = { value: 0 };
  expect(readString(subscriptionBinary, subscriptionOffset)).toBe('my-organization');
  expect(readString(subscriptionBinary, subscriptionOffset)).toBe('my-target');
  expect(readUInt32(subscriptionBinary, subscriptionOffset)).toBe(1_643_892_203);
  expect(readUInt32(subscriptionBinary, subscriptionOffset)).toBe(1_643_892_206);
  expect(readString(subscriptionBinary, subscriptionOffset)).toBe('my-hash');
  expect(readString(subscriptionBinary, subscriptionOffset)).toBe('');
  expect(readString(subscriptionBinary, subscriptionOffset)).toBe('');
  expect(subscriptionOffset.value).toBe(subscriptionBinary.length);

  const registryBinary = Buffer.concat([
    ...serializeRegistryRecordsRowBinary([
      {
        size: 2,
        target: 'my-target',
        hash: 'my-hash',
        name: null,
        body: '{ foo }',
        operation_kind: 'query',
        coordinates: ['Query', 'Query.foo'],
        timestamp: timestamp.asNumber,
        expires_at: expiresAt.asNumber,
      },
    ]),
  ]);
  const registryOffset = { value: 0 };
  expect(readUInt32(registryBinary, registryOffset)).toBe(2);
  expect(readString(registryBinary, registryOffset)).toBe('my-target');
  expect(readString(registryBinary, registryOffset)).toBe('my-hash');
  expect(readString(registryBinary, registryOffset)).toBe('');
  expect(readString(registryBinary, registryOffset)).toBe('{ foo }');
  expect(readString(registryBinary, registryOffset)).toBe('query');
  expect(readVarUInt(registryBinary, registryOffset)).toBe(2);
  expect(readString(registryBinary, registryOffset)).toBe('Query');
  expect(readString(registryBinary, registryOffset)).toBe('Query.foo');
  expect(readUInt32(registryBinary, registryOffset)).toBe(1_643_892_203);
  expect(readUInt32(registryBinary, registryOffset)).toBe(1_643_892_206);
  expect(registryOffset.value).toBe(registryBinary.length);

  const deploymentBinary = Buffer.concat([
    ...serializeAppDeploymentUsageRowBinary([
      {
        target: 'my-target',
        appName: 'app',
        appVersion: '1.0.0',
        lastRequestTimestamp: timestamp.asNumber,
      },
    ]),
  ]);
  const deploymentOffset = { value: 0 };
  expect(readString(deploymentBinary, deploymentOffset)).toBe('my-target');
  expect(readString(deploymentBinary, deploymentOffset)).toBe('app');
  expect(readString(deploymentBinary, deploymentOffset)).toBe('1.0.0');
  expect(readUInt32(deploymentBinary, deploymentOffset)).toBe(1_643_892_203);
  expect(deploymentOffset.value).toBe(deploymentBinary.length);

  const errorsBinary = Buffer.concat([
    ...serializeOperationErrorsRowBinary([
      {
        target: '61f0c404-5cb3-11e7-907b-a6006ad3dba0',
        hash: 'my-hash',
        timestamp: timestamp.asNumber,
        expires_at: expiresAt.asNumber,
        errors: [['UNEXPECTED_ERROR', 'Query.foo']],
      },
    ]),
  ]);
  expect(errorsBinary.subarray(0, 16)).toEqual(
    Buffer.from('e711b35c04c4f061a0dbd36a00a67b90', 'hex'),
  );
  const errorsOffset = { value: 16 };
  expect(readString(errorsBinary, errorsOffset)).toBe('my-hash');
  expect(readUInt32(errorsBinary, errorsOffset)).toBe(1_643_892_203);
  expect(readUInt32(errorsBinary, errorsOffset)).toBe(1_643_892_206);
  expect(readVarUInt(errorsBinary, errorsOffset)).toBe(1);
  expect(readString(errorsBinary, errorsOffset)).toBe('UNEXPECTED_ERROR');
  expect(readString(errorsBinary, errorsOffset)).toBe('Query.foo');
  expect(errorsOffset.value).toBe(errorsBinary.length);
});

function readVarUInt(buffer: Buffer, offset: { value: number }): number {
  let result = 0;
  let shift = 0;
  while (true) {
    const byte = buffer[offset.value++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return result;
    shift += 7;
  }
}

function readString(buffer: Buffer, offset: { value: number }): string {
  const length = readVarUInt(buffer, offset);
  const result = buffer.toString('utf8', offset.value, offset.value + length);
  offset.value += length;
  return result;
}

function readUInt32(buffer: Buffer, offset: { value: number }): number {
  const value = buffer.readUInt32LE(offset.value);
  offset.value += 4;
  return value;
}
