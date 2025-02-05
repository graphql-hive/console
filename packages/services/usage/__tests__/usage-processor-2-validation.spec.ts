import { decodeReport } from '../src/usage-processor-2';

test('correct operation should be valid', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          operationName: 'op1Name',
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
          metadata: {
            client: {
              name: 'clientName',
              version: 'clientVersion',
            },
          },
        },
      ],
    }),
  ).toMatchObject({ success: true });
});

test('$.map.metadata.client can be missing, undefined or null', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          operationName: 'op1Name',
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
          metadata: {
            client: undefined,
          },
        },
      ],
    }),
  ).toMatchObject({ success: true });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          operationName: 'op1Name',
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
          metadata: {
            client: null,
          },
        },
      ],
    }),
  ).toMatchObject({ success: true });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          operationName: 'op1Name',
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
          metadata: {},
        },
      ],
    }),
  ).toMatchObject({ success: true });
});

test('$.map.metadata can be missing, undefined or null', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          operationName: 'op1Name',
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
          metadata: undefined,
        },
      ],
    }),
  ).toMatchObject({ success: true });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          operationName: 'op1Name',
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
          metadata: null,
        },
      ],
    }),
  ).toMatchObject({ success: true });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          operationName: 'op1Name',
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({ success: true });
});

test('$.map.operationName can be missing, undefined or null', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          operationName: undefined,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({ success: true });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          operationName: null,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({ success: true });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({ success: true });
});

test('$.operations can be missing, undefined or null', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'subscription op1Name { field1 }',
          fields: ['Subscription.field1'],
        },
      },
      subscriptionOperations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
        },
      ],
    }),
  ).toMatchObject({ success: true });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'subscription op1Name { field1 }',
          fields: ['Subscription.field1'],
        },
      },
      operations: undefined,
      subscriptionOperations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
        },
      ],
    }),
  ).toMatchObject({ success: true });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'subscription op1Name { field1 }',
          fields: ['Subscription.field1'],
        },
      },
      operations: null,
      subscriptionOperations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
        },
      ],
    }),
  ).toMatchObject({ success: true });
});

test('$.subscriptionOperations can be missing, undefined or null', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          fields: ['query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({ success: true });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          fields: ['query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
      subscriptionOperations: undefined,
    }),
  ).toMatchObject({ success: true });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          fields: ['query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
      subscriptionOperations: null,
    }),
  ).toMatchObject({ success: true });
});

test('$.operations.metadata.client.version is required', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          operationName: 'op1Name',
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
          metadata: {
            client: {
              name: 'clientName',
            },
          },
        },
      ],
    }),
  ).toMatchObject({ success: false });
});

test('$.operations.metadata.client.name is required', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: 'query op1Name { field1 }',
          operationName: 'op1Name',
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
          metadata: {
            client: {
              version: 'clientVersion',
            },
          },
        },
      ],
    }),
  ).toMatchObject({ success: false });
});

test('$.map.operation is required', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: undefined,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: null,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });
});

test('$.map.operation.fields is required', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: null,
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: undefined,
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: [],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });
});

test('$.operations.execution.ok is required', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: undefined,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: null,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: 'true',
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: 1,
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            duration: 123456789,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });
});

test('$.operations.execution.duration is required', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: undefined,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: null,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: '1234567890',
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: true,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            errorsTotal: 0,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });
});

test('$.operations.execution.errorsTotal is required', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: undefined,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: null,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: '0',
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
            errorsTotal: true,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });

  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 123456789,
          },
        },
      ],
    }),
  ).toMatchObject({
    success: false,
  });
});

test('invalid duration and timestamp (-1) gives helpful error response', () => {
  expect(
    decodeReport({
      size: 1,
      map: {
        op1Key: {
          operation: `query op1Name { field1 }`,
          fields: ['Query.field1'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: -1,
          execution: {
            ok: true,
            duration: -1,
            errorsTotal: 1,
          },
        },
      ],
    }),
  ).toEqual({
    errors: [
      {
        errors: [
          {
            message: 'Expected valid unix timestamp in milliseconds',
            path: '/operations/0/timestamp',
          },
          {
            message: 'Expected integer to be greater or equal to 0',
            path: '/operations/0/execution/duration',
          },
          {
            message: 'Expected null',
            path: '/operations',
          },
        ],
        message: 'Expected union value',
        path: '/operations',
      },
    ],
    success: false,
  });
});
