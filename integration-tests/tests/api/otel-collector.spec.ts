import { clickHouseQuery } from '../../testkit/clickhouse';
import { graphql } from '../../testkit/gql';
import { GraphQlOperationType, ResourceAssignmentModeType } from '../../testkit/gql/graphql';
import { execute } from '../../testkit/graphql';
import { initSeed } from '../../testkit/seed';
import { getServiceHost } from '../../testkit/utils';

const TargetTracesQuery = graphql(`
  query TargetTracesQuery($targetId: ID!, $traceIds: [ID!]) {
    target(reference: { byId: $targetId }) {
      id
      viewerCanAccessTraces
      traces(first: 10, filter: { traceIds: $traceIds }) {
        edges {
          node {
            id
            operationName
            operationType
            success
            httpStatusCode
            httpMethod
            spans {
              name
            }
          }
        }
      }
    }
  }
`);

const TargetTracesWithFiltersQuery = graphql(`
  query TargetTracesWithFiltersQuery(
    $targetId: ID!
    $operationNames: [String!]
    $operationTypes: [GraphQLOperationType]
    $success: [Boolean!]
    $httpStatusCodes: [String!]
    $httpMethods: [String!]
  ) {
    target(reference: { byId: $targetId }) {
      id
      traces(
        first: 10
        filter: {
          operationNames: $operationNames
          operationTypes: $operationTypes
          success: $success
          httpStatusCodes: $httpStatusCodes
          httpMethods: $httpMethods
        }
      ) {
        edges {
          node {
            id
            operationName
            operationType
            success
            httpStatusCode
            httpMethod
          }
        }
      }
      tracesFilterOptions {
        operationName {
          value
          count
        }
        operationType {
          value
          count
        }
        success {
          value
          count
        }
        httpStatusCode {
          value
          count
        }
        httpMethod {
          value
          count
        }
      }
    }
  }
`);

async function sendTrace(args: {
  otelCollectorAddress: string;
  accessToken: string;
  targetRef: string;
  traceId: string;
  spanId: string;
  spanName: string;
  attributes?: Record<string, { stringValue?: string; intValue?: string }>;
}) {
  const timestamp = Date.now() * 1_000_000; // nanoseconds
  const response = await fetch(`http://${args.otelCollectorAddress}/v1/traces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${args.accessToken}`,
      'X-Hive-Target-Ref': args.targetRef,
    },
    body: JSON.stringify({
      resourceSpans: [
        {
          resource: {
            attributes: [
              {
                key: 'service.name',
                value: { stringValue: 'test-service' },
              },
            ],
          },
          scopeSpans: [
            {
              scope: {
                name: 'test-scope',
                version: '1.0.0',
              },
              spans: [
                {
                  traceId: args.traceId,
                  spanId: args.spanId,
                  name: args.spanName,
                  kind: 2, // SPAN_KIND_SERVER
                  startTimeUnixNano: timestamp.toString(),
                  endTimeUnixNano: (timestamp + 1_000_000_000).toString(), // 1 second duration
                  attributes: Object.entries(args.attributes ?? {}).map(([key, value]) => ({
                    key,
                    value,
                  })),
                  status: {
                    code: 1, // STATUS_CODE_OK
                  },
                },
              ],
            },
          ],
        },
      ],
    }),
  });
  return response;
}

function generateTraceId() {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateSpanId() {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

async function waitForTraceInClickHouse(traceId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await clickHouseQuery<{ TraceId: string }>(
      `SELECT TraceId FROM otel_traces WHERE TraceId = '${traceId}' LIMIT 1`,
    );
    if (result.rows > 0) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function waitForTraceInNormalized(traceId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await clickHouseQuery<{ trace_id: string }>(
      `SELECT trace_id FROM otel_traces_normalized WHERE trace_id = '${traceId}' LIMIT 1`,
    );
    if (result.rows > 0) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

test('otel-collector accepts traces with access token and inserts to ClickHouse', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken, setFeatureFlag } = await createOrg();
  const { target } = await createProject();

  // Enable OTEL tracing feature flag for this organization
  await setFeatureFlag('otelTracing', true);

  const otelCollectorAddress = await getServiceHost('otel-collector', 4318);

  const { privateAccessKey: accessToken } = await createOrganizationAccessToken({
    permissions: ['traces:report'],
    resources: {
      mode: ResourceAssignmentModeType.All,
    },
  });

  const traceId = generateTraceId();
  const spanId = generateSpanId();

  // Send trace using target ID
  const response = await sendTrace({
    otelCollectorAddress,
    accessToken,
    targetRef: target.id,
    traceId,
    spanId,
    spanName: 'test-span',
    attributes: {
      'hive.graphql': { stringValue: 'true' },
    },
  });

  expect(response.status).toBe(200);

  // Wait for trace to appear in ClickHouse
  const found = await waitForTraceInClickHouse(traceId);
  expect(found).toBe(true);

  // Verify the trace data
  const traceResult = await clickHouseQuery<{
    TraceId: string;
    SpanId: string;
    SpanName: string;
    ServiceName: string;
    SpanAttributes: Record<string, string>;
  }>(
    `SELECT TraceId, SpanId, SpanName, ServiceName, SpanAttributes FROM otel_traces WHERE TraceId = '${traceId}'`,
  );

  expect(traceResult.rows).toBe(1);
  expect(traceResult.data[0].TraceId).toBe(traceId);
  expect(traceResult.data[0].SpanId).toBe(spanId);
  expect(traceResult.data[0].SpanName).toBe('test-span');
  expect(traceResult.data[0].ServiceName).toBe('test-service');
  expect(traceResult.data[0].SpanAttributes['hive.target_id']).toBe(target.id);
});

test('traces can be queried via GraphQL API after insert', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken, setFeatureFlag } = await createOrg();
  const { target } = await createProject();

  // Enable OTEL tracing feature flag for this organization
  await setFeatureFlag('otelTracing', true);

  const otelCollectorAddress = await getServiceHost('otel-collector', 4318);

  const { privateAccessKey: accessToken } = await createOrganizationAccessToken({
    permissions: ['traces:report'],
    resources: {
      mode: ResourceAssignmentModeType.All,
    },
  });

  const traceId = generateTraceId();
  const spanId = generateSpanId();

  // Send a trace with GraphQL attributes (required for normalized view)
  const response = await sendTrace({
    otelCollectorAddress,
    accessToken,
    targetRef: target.id,
    traceId,
    spanId,
    spanName: 'POST /graphql',
    attributes: {
      'hive.graphql': { stringValue: 'true' },
      'graphql.operation.name': { stringValue: 'GetUser' },
      'graphql.operation.type': { stringValue: 'query' },
      'http.status_code': { stringValue: '200' },
      'http.method': { stringValue: 'POST' },
    },
  });

  expect(response.status).toBe(200);

  // Wait for trace to appear in normalized view
  const found = await waitForTraceInNormalized(traceId);
  expect(found).toBe(true);

  // Query traces via GraphQL API
  const result = await execute({
    document: TargetTracesQuery,
    variables: {
      targetId: target.id,
      traceIds: [traceId],
    },
    authToken: ownerToken,
  });

  const data = await result.expectNoGraphQLErrors();

  expect(data.target?.viewerCanAccessTraces).toBe(true);
  expect(data.target?.traces.edges).toHaveLength(1);

  const trace = data.target?.traces.edges[0].node;
  expect(trace?.id).toBe(traceId);
  expect(trace?.operationName).toBe('GetUser');
  expect(trace?.operationType).toBe('QUERY');
  expect(trace?.success).toBe(true);
  expect(trace?.httpStatusCode).toBe('200');
  expect(trace?.httpMethod).toBe('POST');
  expect(trace?.spans).toHaveLength(1);
  expect(trace?.spans[0].name).toBe('POST /graphql');
});

test('otel-collector accepts traces using slug-based target ref', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { organization, createProject, createOrganizationAccessToken, setFeatureFlag } =
    await createOrg();
  const { project, target } = await createProject();

  // Enable OTEL tracing feature flag for this organization
  await setFeatureFlag('otelTracing', true);

  const otelCollectorAddress = await getServiceHost('otel-collector', 4318);

  const { privateAccessKey: accessToken } = await createOrganizationAccessToken({
    permissions: ['traces:report'],
    resources: {
      mode: ResourceAssignmentModeType.All,
    },
  });

  const traceId = generateTraceId();
  const spanId = generateSpanId();
  const targetRef = `${organization.slug}/${project.slug}/${target.slug}`;

  const response = await sendTrace({
    otelCollectorAddress,
    accessToken,
    targetRef,
    traceId,
    spanId,
    spanName: 'test-span-slug',
  });

  expect(response.status).toBe(200);

  const found = await waitForTraceInClickHouse(traceId);
  expect(found).toBe(true);

  const traceResult = await clickHouseQuery<{ SpanAttributes: Record<string, string> }>(
    `SELECT SpanAttributes FROM otel_traces WHERE TraceId = '${traceId}'`,
  );

  expect(traceResult.data[0].SpanAttributes['hive.target_id']).toBe(target.id);
});

test('otel-collector rejects traces without authorization', async () => {
  const otelCollectorAddress = await getServiceHost('otel-collector', 4318);

  const traceId = generateTraceId();
  const spanId = generateSpanId();

  const response = await fetch(`http://${otelCollectorAddress}/v1/traces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hive-Target-Ref': 'some-org/some-project/some-target',
    },
    body: JSON.stringify({
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [
            {
              scope: { name: 'test' },
              spans: [
                {
                  traceId,
                  spanId,
                  name: 'test',
                  kind: 2,
                  startTimeUnixNano: (Date.now() * 1_000_000).toString(),
                  endTimeUnixNano: ((Date.now() + 1000) * 1_000_000).toString(),
                  attributes: [],
                  status: { code: 1 },
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  expect(response.status).toBe(401);
});

test('otel-collector rejects traces without traces:report permission', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken } = await createOrg();
  const { target } = await createProject();

  const otelCollectorAddress = await getServiceHost('otel-collector', 4318);

  // Create token without traces:report permission
  const { privateAccessKey: accessToken } = await createOrganizationAccessToken({
    permissions: ['usage:report'], // wrong permission
    resources: {
      mode: ResourceAssignmentModeType.All,
    },
  });

  const traceId = generateTraceId();
  const spanId = generateSpanId();

  const response = await sendTrace({
    otelCollectorAddress,
    accessToken,
    targetRef: target.id,
    traceId,
    spanId,
    spanName: 'test-span',
  });

  expect(response.status).toBe(401);
});

test('traces can be filtered via GraphQL API', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken, setFeatureFlag } = await createOrg();
  const { target } = await createProject();

  // Enable OTEL tracing feature flag for this organization
  await setFeatureFlag('otelTracing', true);

  const otelCollectorAddress = await getServiceHost('otel-collector', 4318);

  const { privateAccessKey: accessToken } = await createOrganizationAccessToken({
    permissions: ['traces:report'],
    resources: {
      mode: ResourceAssignmentModeType.All,
    },
  });

  // Send multiple traces with different attributes for filtering
  const trace1Id = generateTraceId();
  const trace2Id = generateTraceId();
  const trace3Id = generateTraceId();

  // Trace 1: Query, success, 200
  await sendTrace({
    otelCollectorAddress,
    accessToken,
    targetRef: target.id,
    traceId: trace1Id,
    spanId: generateSpanId(),
    spanName: 'POST /graphql',
    attributes: {
      'hive.graphql': { stringValue: 'true' },
      'graphql.operation.name': { stringValue: 'GetUsers' },
      'graphql.operation.type': { stringValue: 'query' },
      'http.status_code': { stringValue: '200' },
      'http.method': { stringValue: 'POST' },
    },
  });

  // Trace 2: Mutation, success, 200
  await sendTrace({
    otelCollectorAddress,
    accessToken,
    targetRef: target.id,
    traceId: trace2Id,
    spanId: generateSpanId(),
    spanName: 'POST /graphql',
    attributes: {
      'hive.graphql': { stringValue: 'true' },
      'graphql.operation.name': { stringValue: 'CreateUser' },
      'graphql.operation.type': { stringValue: 'mutation' },
      'http.status_code': { stringValue: '200' },
      'http.method': { stringValue: 'POST' },
    },
  });

  // Trace 3: Query, failure, 500 with GraphQL errors
  await sendTrace({
    otelCollectorAddress,
    accessToken,
    targetRef: target.id,
    traceId: trace3Id,
    spanId: generateSpanId(),
    spanName: 'POST /graphql',
    attributes: {
      'hive.graphql': { stringValue: 'true' },
      'graphql.operation.name': { stringValue: 'GetProducts' },
      'graphql.operation.type': { stringValue: 'query' },
      'http.status_code': { stringValue: '500' },
      'http.method': { stringValue: 'POST' },
      'hive.graphql.error.count': { intValue: '1' },
    },
  });

  // Wait for all traces to appear in normalized view
  await waitForTraceInNormalized(trace1Id);
  await waitForTraceInNormalized(trace2Id);
  await waitForTraceInNormalized(trace3Id);

  // Test 1: Filter by operation name
  const resultByOpName = await execute({
    document: TargetTracesWithFiltersQuery,
    variables: {
      targetId: target.id,
      operationNames: ['GetUsers'],
    },
    authToken: ownerToken,
  });
  const dataByOpName = await resultByOpName.expectNoGraphQLErrors();
  expect(dataByOpName.target?.traces.edges.length).toBe(1);
  expect(dataByOpName.target?.traces.edges[0].node.operationName).toBe('GetUsers');

  // Test 2: Filter by operation type (query only)
  const resultByOpType = await execute({
    document: TargetTracesWithFiltersQuery,
    variables: {
      targetId: target.id,
      operationTypes: [GraphQlOperationType.Query],
    },
    authToken: ownerToken,
  });
  const dataByOpType = await resultByOpType.expectNoGraphQLErrors();
  expect(dataByOpType.target?.traces.edges.length).toBe(2);
  const opNames = dataByOpType.target?.traces.edges.map(e => e.node.operationName);
  expect(opNames).toContain('GetUsers');
  expect(opNames).toContain('GetProducts');

  // Test 3: Filter by success status
  const resultBySuccess = await execute({
    document: TargetTracesWithFiltersQuery,
    variables: {
      targetId: target.id,
      success: [false],
    },
    authToken: ownerToken,
  });
  const dataBySuccess = await resultBySuccess.expectNoGraphQLErrors();
  expect(dataBySuccess.target?.traces.edges.length).toBe(1);
  expect(dataBySuccess.target?.traces.edges[0].node.httpStatusCode).toBe('500');

  // Test 4: Filter by HTTP status code
  const resultByStatus = await execute({
    document: TargetTracesWithFiltersQuery,
    variables: {
      targetId: target.id,
      httpStatusCodes: ['200'],
    },
    authToken: ownerToken,
  });
  const dataByStatus = await resultByStatus.expectNoGraphQLErrors();
  expect(dataByStatus.target?.traces.edges.length).toBe(2);
  expect(dataByStatus.target?.traces.edges.every(e => e.node.httpStatusCode === '200')).toBe(true);

  // Test 5: Verify filter options are populated
  const resultFilterOptions = await execute({
    document: TargetTracesWithFiltersQuery,
    variables: {
      targetId: target.id,
    },
    authToken: ownerToken,
  });
  const dataFilterOptions = await resultFilterOptions.expectNoGraphQLErrors();
  const filterOptions = dataFilterOptions.target?.tracesFilterOptions;

  // Check operation names are available
  expect(filterOptions?.operationName.length).toBeGreaterThanOrEqual(3);
  const opNameValues = filterOptions?.operationName.map(o => o.value);
  expect(opNameValues).toContain('GetUsers');
  expect(opNameValues).toContain('CreateUser');
  expect(opNameValues).toContain('GetProducts');

  // Check operation types are available
  expect(filterOptions?.operationType.length).toBeGreaterThanOrEqual(2);
  const opTypeValues = filterOptions?.operationType.map(o => o.value);
  expect(opTypeValues).toContain('query');
  expect(opTypeValues).toContain('mutation');

  // Check HTTP status codes are available
  expect(filterOptions?.httpStatusCode.length).toBeGreaterThanOrEqual(2);
  const statusValues = filterOptions?.httpStatusCode.map(o => o.value);
  expect(statusValues).toContain('200');
  expect(statusValues).toContain('500');
});

test('otel-collector populates otel_traces_normalized for GraphQL spans', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken, setFeatureFlag } = await createOrg();
  const { target } = await createProject();

  // Enable OTEL tracing feature flag for this organization
  await setFeatureFlag('otelTracing', true);

  const otelCollectorAddress = await getServiceHost('otel-collector', 4318);

  const { privateAccessKey: accessToken } = await createOrganizationAccessToken({
    permissions: ['traces:report'],
    resources: {
      mode: ResourceAssignmentModeType.All,
    },
  });

  const traceId = generateTraceId();
  const spanId = generateSpanId();

  // Send a root span (no parent) with GraphQL attributes
  const response = await sendTrace({
    otelCollectorAddress,
    accessToken,
    targetRef: target.id,
    traceId,
    spanId,
    spanName: 'POST /graphql',
    attributes: {
      'hive.graphql': { stringValue: 'true' },
      'graphql.operation.name': { stringValue: 'GetUser' },
      'graphql.operation.type': { stringValue: 'query' },
      'http.status_code': { stringValue: '200' },
      'http.method': { stringValue: 'POST' },
    },
  });

  expect(response.status).toBe(200);

  const found = await waitForTraceInNormalized(traceId);
  expect(found).toBe(true);

  // Check otel_traces_normalized
  const normalizedResult = await clickHouseQuery<{
    target_id: string;
    trace_id: string;
    graphql_operation_name: string;
    graphql_operation_type: string;
    http_status_code: string;
    http_method: string;
  }>(
    `SELECT target_id, trace_id, graphql_operation_name, graphql_operation_type, http_status_code, http_method FROM otel_traces_normalized WHERE trace_id = '${traceId}'`,
  );

  expect(normalizedResult.rows).toBe(1);
  expect(normalizedResult.data[0].target_id).toBe(target.id);
  expect(normalizedResult.data[0].graphql_operation_name).toBe('GetUser');
  expect(normalizedResult.data[0].graphql_operation_type).toBe('query');
  expect(normalizedResult.data[0].http_status_code).toBe('200');
  expect(normalizedResult.data[0].http_method).toBe('POST');
});
