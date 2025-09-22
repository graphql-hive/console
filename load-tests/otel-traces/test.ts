import { randomIntBetween, randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import * as immer from 'https://unpkg.com/immer@10.1.3/dist/immer.mjs';
import http from 'k6/http';

// Cardinality Variables Start
const countUniqueErrorCodes = 1_000;
const countUniqueClients = 1_000;
const appVersionsPerClient = 1_000;
// Cardinality Variables End

const otelEndpointUrl = __ENV.OTEL_ENDPOINT || 'http://localhost:4318/v1/traces';
console.log(
  `Endpoint: ${otelEndpointUrl}. (Overwrite using the OTEL_ENDPOINT environment variable)`,
);

const HIVE_ORGANIZATION_ACCESS_TOKEN = __ENV.HIVE_ORGANIZATION_ACCESS_TOKEN;
if (!HIVE_ORGANIZATION_ACCESS_TOKEN) {
  throw new Error('Environment variable HIVE_ORGANIZATION_ACCESS_TOKEN is missing.');
}

const HIVE_TARGET_REF = __ENV.HIVE_TARGET_REF;
if (!HIVE_TARGET_REF) {
  throw new Error('Environment variable HIVE_TARGET_REF is missing.');
}

// A helper to generate a random 16-byte trace/span ID in hex
function randomId(bytes: number = 32): string {
  const chars = 'abcdef0123456789';
  let out = '';
  for (let i = 0; i < bytes * 2; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function toTimeUnixNano(date = new Date()) {
  const milliseconds = date.getTime(); // ms since epoch
  const nanoseconds = BigInt(milliseconds) * 1_000_000n; // ns = ms × 1_000_000
  return nanoseconds;
}

function getRandomIndex(length: number) {
  return Math.floor(Math.random() * length);
}

function randomArrayItem<T>(arr: Array<T>) {
  return arr[getRandomIndex(arr.length)];
}

const clientNames = new Array(countUniqueClients)
  .fill(null)
  .map(() => randomString(randomIntBetween(5, 30)));

const appVersions = new Map<string, Array<string>>();

for (const name of clientNames) {
  const versions = new Array<string>();
  for (let i = 0; i <= appVersionsPerClient; i++) {
    versions.push(randomString(20));
  }
  appVersions.set(name, versions);
}

function generateRandomClient() {
  const name = randomArrayItem(clientNames);
  const version = randomArrayItem(appVersions.get(name)!);

  return {
    name,
    version,
  };
}

const errorCodes = new Array(countUniqueErrorCodes)
  .fill(null)
  .map(() => randomString(randomIntBetween(3, 30)));

function getRandomErrorCodes() {
  if (randomIntBetween(0, 10) > 3) {
    return '';
  }

  if (randomIntBetween(0, 10) > 3) {
    return new Array(randomIntBetween(1, 10)).fill(null).map(() => randomArrayItem(errorCodes));
  }

  return [randomArrayItem(errorCodes)];
}

// graphql query document size
// operation name length
//

const references: Array<Reference> = [
  open('./../../scripts/seed-traces/sample-introspection.json'),
  open('./../../scripts/seed-traces/sample-my-profile.json'),
  open('./../../scripts/seed-traces/sample-products-overview.json'),
  open('./../../scripts/seed-traces/sample-user-review.json'),
  open('./../../scripts/seed-traces/sample-user-review-error-missing-variables.json'),
  open('./../../scripts/seed-traces/sample-user-review-not-found.json'),
].map(res => JSON.parse(res));

function mutate(currentTime: Date, reference: Reference) {
  const newTraceId = randomId();
  const newSpanIds = new Map<string, string>();

  function getNewSpanId(spanId: string) {
    let newSpanId = newSpanIds.get(spanId);
    if (!newSpanId) {
      newSpanId = randomId(16);
      newSpanIds.set(spanId, newSpanId);
    }

    return newSpanId;
  }

  let rootTrace:
    | Reference[number]['resourceSpans'][number]['scopeSpans'][number]['spans'][number]
    | null = null;

  for (const payload of reference) {
    for (const resourceSpan of payload.resourceSpans) {
      for (const scopeSpan of resourceSpan.scopeSpans) {
        for (const span of scopeSpan.spans) {
          if (span.parentSpanId === undefined) {
            rootTrace = span;
            const client = generateRandomClient();

            rootTrace.attributes.push(
              {
                key: 'hive.client.name',
                value: { stringValue: client.name },
              },
              {
                key: 'hive.client.version',
                value: { stringValue: client.version },
              },
              // TODO: actually calculate this based on the operation.
              {
                key: 'hive.graphql.operation.hash',
                value: { stringValue: randomString(20) },
              },
            );

            const errors = getRandomErrorCodes();

            if (errors) {
              rootTrace.attributes.push(
                {
                  key: 'hive.graphql.error.codes',
                  value: { stringValue: errors.join(',') },
                },
                {
                  key: 'hive.graphql.error.count',
                  value: { stringValue: String(errors.length) },
                },
              );
            }
            break;
          }
        }
      }
    }
  }

  if (!rootTrace) {
    throw new Error('Parent Span must always be the first span in the file.');
  }

  const startTime = BigInt(rootTrace.startTimeUnixNano);
  const currentTimeB = toTimeUnixNano(currentTime);

  for (const payload of reference) {
    for (const resourceSpans of payload.resourceSpans) {
      for (const scopeSpan of resourceSpans.scopeSpans) {
        for (const span of scopeSpan.spans) {
          if (span.parentSpanId) {
            span.parentSpanId = getNewSpanId(span.parentSpanId);
          }

          span.spanId = getNewSpanId(span.spanId);
          span.traceId = newTraceId;

          const spanStartTime = BigInt(span.startTimeUnixNano);
          const spanEndTime = BigInt(span.endTimeUnixNano);
          const spanDuration = spanEndTime - spanStartTime;
          const spanOffset = spanStartTime - startTime;
          const newStartTime = currentTimeB + spanOffset;
          span.startTimeUnixNano = newStartTime.toString();
          span.endTimeUnixNano = (newStartTime + spanDuration).toString();

          if (span.events.length) {
            for (const event of span.events) {
              const spanStartTime = BigInt(event.timeUnixNano);
              const spanOffset = spanStartTime - startTime;
              const newStartTime = currentTimeB + spanOffset;
              event.timeUnixNano = newStartTime.toString();
            }
          }
        }
      }
    }
  }
}

function createTrace(date: Date, reference: Reference) {
  return immer.produce(reference, draft => mutate(date, draft));
}

export default function () {
  const reference = randomArrayItem(references);
  const tracePayloads = createTrace(new Date(), reference);

  http.post(otelEndpointUrl, JSON.stringify(tracePayloads), {
    headers: { 'Content-Type': 'application/json' },
  });
}
