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
