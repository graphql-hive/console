import { usageProcessorV2 } from '../src/usage-processor-2';

function buildLogger() {
  const logger: any = {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  };
  logger.child = vi.fn(() => logger);
  return logger;
}

const targetSelector = {
  targetId: 'target-1',
  projectId: 'project-1',
  organizationId: 'org-1',
};

function buildIncomingReport(overrides: Record<string, unknown>) {
  return {
    size: 1,
    map: {
      op1Key: {
        operation: 'query op1 { field1 }',
        operationName: 'op1',
        fields: ['Query.field1'],
      },
    },
    ...overrides,
  };
}

test('an operation with a persistedDocumentHash populates appDeploymentUsageTimestamps keyed by name/version', () => {
  const result = usageProcessorV2(
    buildLogger(),
    buildIncomingReport({
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: { ok: true, errorsTotal: 0, duration: 1 },
          persistedDocumentHash: 'my-app~1.0.0~abc123',
        },
      ],
    }),
    targetSelector,
    null,
  );

  expect(result.success).toBe(true);
  if (!result.success) return;
  expect(result.report.appDeploymentUsageTimestamps).toEqual({
    'my-app/1.0.0': expect.any(Number),
  });
});

test('an operation with a persistedDocumentHash and graph appends the graph ids to the appDeploymentUsageTimestamps key', () => {
  const graph = {
    graphId: '0f9c3a39-3c4e-4a3b-9a0c-6f1f0b9a2f01',
    graphVersionId: '6b1d4c2e-8a3f-4e5d-9b7c-1a2b3c4d5e6f',
  };
  const result = usageProcessorV2(
    buildLogger(),
    buildIncomingReport({
      size: 2,
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: { ok: true, errorsTotal: 0, duration: 1 },
          persistedDocumentHash: 'my-app~1.0.0~abc123',
          metadata: { graph },
        },
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: { ok: true, errorsTotal: 0, duration: 1 },
          persistedDocumentHash: 'my-app~1.0.0~abc123',
        },
      ],
    }),
    targetSelector,
    null,
  );

  expect(result.success).toBe(true);
  if (!result.success) return;
  expect(result.report.appDeploymentUsageTimestamps).toEqual({
    [`my-app/1.0.0/${graph.graphId}/${graph.graphVersionId}`]: expect.any(Number),
    'my-app/1.0.0': expect.any(Number),
  });
});

test('graph ids are lowercased so differently-cased ids for the same graph are treated as equal', () => {
  const graphId = '0f9c3a39-3c4e-4a3b-9a0c-6f1f0b9a2f01';
  const graphVersionId = '6b1d4c2e-8a3f-4e5d-9b7c-1a2b3c4d5e6f';
  const result = usageProcessorV2(
    buildLogger(),
    buildIncomingReport({
      size: 2,
      operations: [
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: { ok: true, errorsTotal: 0, duration: 1 },
          persistedDocumentHash: 'my-app~1.0.0~abc123',
          metadata: {
            graph: { graphId: graphId.toUpperCase(), graphVersionId: graphVersionId.toUpperCase() },
          },
        },
        {
          operationMapKey: 'op1Key',
          timestamp: Date.now(),
          execution: { ok: true, errorsTotal: 0, duration: 1 },
          persistedDocumentHash: 'my-app~1.0.0~abc123',
          metadata: { graph: { graphId, graphVersionId } },
        },
      ],
    }),
    targetSelector,
    null,
  );

  expect(result.success).toBe(true);
  if (!result.success) return;
  expect(result.report.appDeploymentUsageTimestamps).toEqual({
    [`my-app/1.0.0/${graphId}/${graphVersionId}`]: expect.any(Number),
  });
  for (const operation of result.report.operations) {
    expect(operation.metadata?.graph).toEqual({ graphId, graphVersionId });
  }
});
