import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { got } from 'got';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const targetSlug = args[0];

async function resolveTargetId(slug: string, authUrl: string, token: string): Promise<string> {
  const response = await got.get(`${authUrl}/otel-auth`, {
    headers: {
      'X-Hive-Target-Ref': slug,
      Authorization: `Bearer ${token}`,
    },
    throwHttpErrors: false,
  });

  if (response.statusCode !== 200) {
    const body = JSON.parse(response.body);
    throw new Error(`Failed to resolve target: ${body.message || response.body}`);
  }

  const body = JSON.parse(response.body) as { targetId: string };
  return body.targetId;
}

if (!targetSlug || targetSlug.startsWith('--')) {
  console.error('Error: TARGET_SLUG is required as the first argument');
  console.error('');
  console.error('Usage: pnpm seed:traces <target_slug> [options]');
  console.error('');
  console.error('Arguments:');
  console.error('  target_slug        Target slug in format: org/project/target (required)');
  console.error('');
  console.error('Options:');
  console.error('  --token=TOKEN      Authorization token for the auth endpoint (required)');
  console.error('  --auth=URL         Auth endpoint URL (default: http://localhost:3001)');
  console.error('  --count=N          Total number of traces to generate (default: 6)');
  console.error('                     Supports: 1000, 10k, 500k, 1m');
  console.error('  --days=N           Number of days to scatter traces across (default: 1)');
  console.error('                     Supports: 1, 7, 30, etc.');
  console.error(
    '  --clickhouse=URL   ClickHouse connection string (default: http://test:test@localhost:8123)',
  );
  console.error('                     Format: http://username:password@host:port');
  console.error('');
  console.error('Examples:');
  console.error(
    '  pnpm seed:traces the-guild/my-project/production --token=abc123',
  );
  console.error(
    '  pnpm seed:traces the-guild/my-project/production --token=abc123 --count=1k',
  );
  console.error(
    '  pnpm seed:traces the-guild/my-project/production --token=abc123 --count=10k --days=7',
  );
  console.error(
    '  pnpm seed:traces the-guild/my-project/production --token=abc123 --auth=http://remote:8082',
  );
  process.exit(1);
}

function getArgValue(name: string, defaultValue: string): string {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
}

function parseNumber(value: string): number {
  const normalized = value.toLowerCase().trim();

  // Handle k/m suffixes
  if (normalized.endsWith('k')) {
    return Math.floor(parseFloat(normalized.slice(0, -1)) * 1000);
  }
  if (normalized.endsWith('m')) {
    return Math.floor(parseFloat(normalized.slice(0, -1)) * 1000000);
  }

  return parseInt(normalized, 10);
}

const totalTraceCount = ((val: number) => (!Number.isNaN(val) ? val : 6))(
  parseNumber(getArgValue('count', '6')),
);
const timeRangeDays = ((val: number) => (!Number.isNaN(val) ? val : 1))(
  parseNumber(getArgValue('days', '1')),
);
const clickhouseUrl = getArgValue('clickhouse', 'http://test:test@localhost:8123');
const authUrl = getArgValue('auth', 'http://localhost:3001');
const authToken = getArgValue('token', '');

if (!authToken) {
  console.error('Error: --token is required');
  console.error('');
  console.error('Usage: pnpm seed:traces <target_slug> --token=YOUR_TOKEN [options]');
  process.exit(1);
}

const numSamples = 6; // We have 6 sample traces
const duplicateFactor = Math.ceil(totalTraceCount / numSamples);

// Parse ClickHouse URL
const clickhouseUrlObj = new URL(clickhouseUrl);
const clickhouseConfig = {
  protocol: clickhouseUrlObj.protocol.replace(':', ''),
  host: clickhouseUrlObj.hostname,
  port: parseInt(clickhouseUrlObj.port || '8123', 10),
  username: clickhouseUrlObj.username || 'default',
  password: clickhouseUrlObj.password || '',
};

const estimatedTraces = numSamples * duplicateFactor; // Actual traces that will be created
const estimatedSpans = estimatedTraces * 10; // ~10 spans per trace average

console.log(`
  ClickHouse:         ${clickhouseConfig.protocol}://${clickhouseConfig.host}:${clickhouseConfig.port}
  Target slug:        ${targetSlug}
  Requested traces:   ${totalTraceCount.toLocaleString()}

  Estimated output:
  - Traces:           ~${estimatedTraces.toLocaleString()}
  - Spans:            ~${estimatedSpans.toLocaleString()}
  - Time range:       Last ${timeRangeDays} day${timeRangeDays === 1 ? '' : 's'}
`);

const endpoint = `${clickhouseConfig.protocol}://${clickhouseConfig.host}:${clickhouseConfig.port}`;

// Type definitions for OTEL trace format
type OTELAttribute = {
  key: string;
  value: {
    stringValue?: string;
    intValue?: number;
    arrayValue?: {
      values: Array<{ stringValue: string }>;
    };
  };
};

type OTELSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OTELAttribute[];
  events: Array<{
    timeUnixNano: string;
    name: string;
    attributes: OTELAttribute[];
  }>;
  status: {
    code: number;
  };
};

type OTELTrace = Array<{
  resourceSpans: Array<{
    resource: {
      attributes: OTELAttribute[];
    };
    scopeSpans: Array<{
      scope: {
        name: string;
        version?: string;
      };
      spans: OTELSpan[];
    }>;
  }>;
}>;

function randomId(hexChars: number = 32): string {
  // hexChars is the number of hex characters, so we need half that many bytes.
  const numBytes = Math.ceil(hexChars / 2);
  return randomBytes(numBytes).toString('hex').slice(0, hexChars);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomClient() {
  const names = ['Apollo Client', 'urql', 'Relay', 'graphql-request', 'custom-client'];
  const versions = ['3.7.0', '4.0.0', '2.1.0', '1.0.0', '5.2.3'];
  return {
    name: names[randomInt(0, names.length - 1)],
    version: versions[randomInt(0, versions.length - 1)],
  };
}

function getRandomErrorCodes(): string[] {
  if (randomInt(0, 10) > 7) {
    // 30% chance of errors
    return [];
  }
  const errorCodes = [
    'INTERNAL_SERVER_ERROR',
    'BAD_USER_INPUT',
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'NOT_FOUND',
  ];
  if (randomInt(0, 10) > 5) {
    return Array.from(
      { length: randomInt(1, 3) },
      () => errorCodes[randomInt(0, errorCodes.length - 1)],
    );
  }
  return [errorCodes[randomInt(0, errorCodes.length - 1)]];
}

function attributesToMap(attributes: OTELAttribute[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const attr of attributes) {
    if (attr.value.stringValue !== undefined) {
      map[attr.key] = attr.value.stringValue;
    } else if (attr.value.intValue !== undefined) {
      map[attr.key] = String(attr.value.intValue);
    } else if (attr.value.arrayValue) {
      map[attr.key] = JSON.stringify(attr.value.arrayValue.values.map(v => v.stringValue));
    }
  }
  return map;
}

function unixNanoToDateTime(nanoStr: string): string {
  const nanos = BigInt(nanoStr);
  const millis = Number(nanos / 1_000_000n);
  const date = new Date(millis);
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

function convertOTELToClickHouse(otelTrace: OTELTrace, currentTime: Date, targetSlug: string) {
  const clickhouseSpans: any[] = [];
  const newTraceId = randomId();
  const spanIdMap = new Map<string, string>();

  function getNewSpanId(oldSpanId: string): string {
    if (!spanIdMap.has(oldSpanId)) {
      spanIdMap.set(oldSpanId, randomId(16));
    }
    return spanIdMap.get(oldSpanId)!;
  }

  // Find the root span to get timing offset
  let rootStartTime: bigint | null = null;
  for (const payload of otelTrace) {
    for (const resourceSpan of payload.resourceSpans) {
      for (const scopeSpan of resourceSpan.scopeSpans) {
        for (const span of scopeSpan.spans) {
          if (!span.parentSpanId) {
            rootStartTime = BigInt(span.startTimeUnixNano);
            break;
          }
        }
        if (rootStartTime) break;
      }
      if (rootStartTime) break;
    }
    if (rootStartTime) break;
  }

  if (!rootStartTime) {
    throw new Error('No root span found in trace');
  }

  const currentTimeNano = BigInt(currentTime.getTime()) * 1_000_000n;

  for (const payload of otelTrace) {
    for (const resourceSpan of payload.resourceSpans) {
      const resourceAttrs = attributesToMap(resourceSpan.resource.attributes);

      for (const scopeSpan of resourceSpan.scopeSpans) {
        for (const span of scopeSpan.spans) {
          const spanAttrs = attributesToMap(span.attributes);

          // Add target_id and hive.graphql marker
          spanAttrs['hive.target_id'] = targetSlug;
          if (!span.parentSpanId) {
            spanAttrs['hive.graphql'] = 'true';

            // Add client info to root span
            const client = generateRandomClient();
            spanAttrs['hive.client.name'] = client.name;
            spanAttrs['hive.client.version'] = client.version;
            spanAttrs['hive.graphql.operation.hash'] = randomString(20);

            // Add error codes randomly
            const errorCodes = getRandomErrorCodes();
            if (errorCodes.length > 0) {
              spanAttrs['hive.graphql.error.codes'] = JSON.stringify(errorCodes);
              spanAttrs['hive.graphql.error.count'] = String(errorCodes.length);
            } else {
              spanAttrs['hive.graphql.error.count'] = '0';
            }
          }

          // Adjust timing
          const spanStartNano = BigInt(span.startTimeUnixNano);
          const spanEndNano = BigInt(span.endTimeUnixNano);
          const spanDuration = spanEndNano - spanStartNano;
          const spanOffset = spanStartNano - rootStartTime;
          const newStartTime = currentTimeNano + spanOffset;

          const clickhouseSpan = {
            Timestamp: unixNanoToDateTime(newStartTime.toString()),
            TraceId: newTraceId,
            SpanId: getNewSpanId(span.spanId),
            ParentSpanId: span.parentSpanId ? getNewSpanId(span.parentSpanId) : '',
            TraceState: '',
            SpanName: span.name,
            SpanKind: `SPAN_KIND_${span.kind === 1 ? 'INTERNAL' : span.kind === 2 ? 'SERVER' : span.kind === 3 ? 'CLIENT' : 'UNSPECIFIED'}`,
            ServiceName: resourceAttrs['service.name'] || 'unknown',
            ResourceAttributes: resourceAttrs,
            ScopeName: scopeSpan.scope.name,
            ScopeVersion: scopeSpan.scope.version || '',
            SpanAttributes: spanAttrs,
            Duration: spanDuration.toString(),
            StatusCode:
              span.status.code === 1
                ? 'STATUS_CODE_OK'
                : span.status.code === 2
                  ? 'STATUS_CODE_ERROR'
                  : 'STATUS_CODE_UNSET',
            StatusMessage: '',
            'Events.Timestamp': span.events.map(e => {
              const eventTime = BigInt(e.timeUnixNano);
              const eventOffset = eventTime - rootStartTime;
              const newEventTime = currentTimeNano + eventOffset;
              return unixNanoToDateTime(newEventTime.toString());
            }),
            'Events.Name': span.events.map(e => e.name),
            'Events.Attributes': span.events.map(e => attributesToMap(e.attributes)),
            'Links.TraceId': [] as string[],
            'Links.SpanId': [] as string[],
            'Links.TraceState': [] as string[],
            'Links.Attributes': [] as Record<string, string>[],
          };

          clickhouseSpans.push(clickhouseSpan);
        }
      }
    }
  }

  return clickhouseSpans;
}

async function loadTraceSamples(): Promise<OTELTrace[]> {
  // Script is now in scripts/seed-traces/, samples are in the same directory
  const samplesDir = __dirname;

  const traces: OTELTrace[] = await Promise.all([
    fs.readFile(path.join(samplesDir, 'sample-introspection.json'), 'utf-8').then(JSON.parse),
    fs.readFile(path.join(samplesDir, 'sample-my-profile.json'), 'utf-8').then(JSON.parse),
    fs.readFile(path.join(samplesDir, 'sample-products-overview.json'), 'utf-8').then(JSON.parse),
    fs.readFile(path.join(samplesDir, 'sample-user-review.json'), 'utf-8').then(JSON.parse),
    fs
      .readFile(path.join(samplesDir, 'sample-user-review-error-missing-variables.json'), 'utf-8')
      .then(JSON.parse),
    fs
      .readFile(path.join(samplesDir, 'sample-user-review-not-found.json'), 'utf-8')
      .then(JSON.parse),
  ]);

  return traces;
}

function generateTimestamp(index: number, total: number): Date {
  // Scatter timestamps with a wavy pattern across the configured time range
  const now = Date.now();
  const startTime = now - timeRangeDays * 24 * 60 * 60 * 1000;
  const timeRange = now - startTime;

  // Use inverse CDF of a wave-modulated distribution for wavy density
  // More traces during "peaks", fewer during "valleys"
  const position = index / Math.max(1, total - 1);

  // Create wavy pattern using sine waves
  // Multiple overlapping waves for a more natural look
  const waves = 3; // Number of wave cycles
  const wavePhase = position * Math.PI * 2 * waves;
  const waveModulation = Math.sin(wavePhase) * 0.15; // 15% amplitude

  // Apply modulation while keeping within [0, 1] bounds
  const modulatedPosition = Math.max(0, Math.min(1, position + waveModulation));
  const baseTime = startTime + timeRange * modulatedPosition;

  // Add some jitter (~15 minutes) to avoid all traces being at exact intervals
  const jitter = (Math.random() - 0.5) * 2 * 15 * 60 * 1000; // ~15 minutes

  return new Date(baseTime + jitter);
}

async function insertSpans(spans: any[]) {
  const jsonLines = spans.map(span => JSON.stringify(span)).join('\n');

  await got.post(endpoint, {
    body: jsonLines,
    searchParams: {
      query: 'INSERT INTO otel_traces FORMAT JSONEachRow',
      async_insert: 1,
      wait_for_async_insert: 1,
    },
    headers: {
      'Content-Type': 'application/x-ndjson',
    },
    username: clickhouseConfig.username,
    password: clickhouseConfig.password,
  });
}

async function executeClickHouseQuery(query: string) {
  await got.post(endpoint, {
    body: query,
    searchParams: {
      default_format: 'JSON',
      wait_end_of_query: '1',
      // Enable external sorting to avoid memory limits when using window functions
      max_bytes_before_external_sort: '500000000', // 500MB before spilling to disk
    },
    headers: {
      Accept: 'application/json',
    },
    username: clickhouseConfig.username,
    password: clickhouseConfig.password,
  });
}

async function seedTraces() {
  const targetId = await resolveTargetId(targetSlug, authUrl, authToken);

  console.log('Loading trace samples...');
  const traceSamples = await loadTraceSamples();
  console.log(`Loaded ${traceSamples.length} trace samples`);

  console.log('Generating traces from all samples...');
  const uniqueSpans: any[] = [];
  const traceIds: string[] = [];

  const totalTraces = traceSamples.length * duplicateFactor;

  // Generate one trace for each sample with evenly distributed timestamps
  for (let i = 0; i < traceSamples.length; i++) {
    const sample = traceSamples[i];
    const timestamp = generateTimestamp(i, totalTraces);
    const spans = convertOTELToClickHouse(sample, timestamp, targetId);
    uniqueSpans.push(...spans);

    // Capture the trace ID (first span's trace ID)
    if (spans.length > 0) {
      traceIds.push(spans[0].TraceId);
    }
  }

  const tracesCount = traceSamples.length;
  console.log(`Generated ${uniqueSpans.length} spans across ${tracesCount} unique traces`);

  // Insert unique traces in batches
  const batchSize = 1000;
  let inserted = 0;

  console.log('Inserting unique traces into ClickHouse...');
  for (let i = 0; i < uniqueSpans.length; i += batchSize) {
    const batch = uniqueSpans.slice(i, i + batchSize);
    await insertSpans(batch);
    inserted += batch.length;
    console.log(
      `Inserted ${inserted}/${uniqueSpans.length} spans (${Math.round((inserted / uniqueSpans.length) * 100)}%)`,
    );
  }

  console.log('- Unique traces inserted successfully!');

  // Now duplicate using ClickHouse for massive scale
  if (duplicateFactor > 1) {
    const actualDuplicates = duplicateFactor - 1;
    const finalTraceCount = tracesCount * duplicateFactor;

    console.log(`\nDuplicating to reach ${finalTraceCount.toLocaleString()} total traces:`);

    const now = Date.now();
    const startTime = now - timeRangeDays * 24 * 60 * 60 * 1000;
    const timeRange = now - startTime;

    // Store original trace IDs for tracking
    const traceIdsCondition = traceIds.map(id => `'${id}'`).join(', ');

    // Process in chunks to avoid ClickHouse memory limits
    // Each chunk duplicates all 6 traces by a batch of duplicate indices
    const chunkSize = 1000; // Duplicate 5k times per chunk (creates ~30k traces per chunk)
    const numChunks = Math.ceil(actualDuplicates / chunkSize);

    for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
      const startDupIndex = chunkIndex * chunkSize + 1;
      const endDupIndex = Math.min((chunkIndex + 1) * chunkSize, actualDuplicates);
      const duplicatesInChunk = endDupIndex - startDupIndex + 1;

      // Calculate the global trace index offset for this chunk
      // Each chunk starts at: (chunkIndex * chunkSize * tracesCount)
      const globalTraceOffset = chunkIndex * chunkSize * tracesCount;

      console.log(
        `Processing chunk ${chunkIndex + 1}/${numChunks}: duplicating ${duplicatesInChunk.toLocaleString()} times...`,
      );

      // Wave parameters for wavy distribution
      const waveCount = 3; // Number of wave cycles across the time range
      const waveAmplitude = 0.15; // 15% amplitude

      const duplicateQuery = `
        INSERT INTO otel_traces
        SELECT
          -- Adjust timestamp: distribute with wavy pattern across configured time range
          toDateTime64(
            ${startTime / 1000} + (
              -- Base position with wave modulation for wavy density pattern
              (((dense_rank() OVER (ORDER BY original_traces.TraceId, dup_index) - 1) + ${globalTraceOffset}) / ${totalTraces}) +
              (sin((((dense_rank() OVER (ORDER BY original_traces.TraceId, dup_index) - 1) + ${globalTraceOffset}) / ${totalTraces}) * ${Math.PI * 2 * waveCount}) * ${waveAmplitude})
            ) * ${timeRange / 1000} +
            ((toUnixTimestamp64Milli(original_traces.Timestamp) - toUnixTimestamp64Milli(min(original_traces.Timestamp) OVER (PARTITION BY original_traces.TraceId))) / 1000) +
            ((sipHash64(original_traces.TraceId, dup_index) % 1800) - 900), -- Add ~15 min jitter (deterministic per trace)
            9, 'UTC'
          ) AS Timestamp,

          -- Generate new TraceId using hash of original + duplicate index
          lower(hex(sipHash128(original_traces.TraceId, dup_index))) AS TraceId,

          -- Generate new SpanId using hash of original + duplicate index
          lower(hex(sipHash64(original_traces.SpanId, dup_index))) AS SpanId,

          -- Map ParentSpanId if it exists (hash it the same way)
          if(original_traces.ParentSpanId != '', lower(hex(sipHash64(original_traces.ParentSpanId, dup_index))), '') AS ParentSpanId,

          original_traces.TraceState,
          original_traces.SpanName,
          original_traces.SpanKind,
          original_traces.ServiceName,
          original_traces.ResourceAttributes,
          original_traces.ScopeName,
          original_traces.ScopeVersion,
          original_traces.SpanAttributes,
          original_traces.Duration,
          original_traces.StatusCode,
          original_traces.StatusMessage,
          original_traces."Events.Timestamp",
          original_traces."Events.Name",
          original_traces."Events.Attributes",
          original_traces."Links.TraceId",
          original_traces."Links.SpanId",
          original_traces."Links.TraceState",
          original_traces."Links.Attributes"
        FROM (
          SELECT * FROM otel_traces
          WHERE TraceId IN (${traceIdsCondition})
        ) AS original_traces
        CROSS JOIN (SELECT number AS dup_index FROM numbers(${startDupIndex}, ${duplicatesInChunk})) AS duplicate_numbers
        ORDER BY original_traces.TraceId, dup_index
      `;

      await executeClickHouseQuery(duplicateQuery);
    }

    const totalSpans = uniqueSpans.length * duplicateFactor;
    console.log(
      `\n- Successfully created ${finalTraceCount.toLocaleString()} traces (${totalSpans.toLocaleString()} spans)`,
    );
    console.log(
      `- Data distributed across last ${timeRangeDays} day${timeRangeDays === 1 ? '' : 's'}`,
    );
  }

  console.log('\n- Trace seeding completed!');
}

seedTraces().catch(error => {
  console.error('Failed to seed traces:', error);
  process.exit(1);
});
