import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as date from 'date-fns';
import * as immer from 'immer';

// This is just copy pasted here to infer the TS type
// Please feel free to collapse this section.
const reference = [
  {
    resourceSpans: [
      {
        resource: {
          attributes: [
            {
              key: 'service.name',
              value: {
                stringValue: 'hive-gateway',
              },
            },
            {
              key: 'service.version',
              value: {
                stringValue: '5.13.4',
              },
            },
          ],
          droppedAttributesCount: 0,
        },
        scopeSpans: [
          {
            scope: {
              name: 'gateway',
            },
            spans: [
              {
                traceId: 'd72a6b878beb3fee4287243c1c51ebaa',
                spanId: 'bf7578eaabcd9963',
                name: 'GET /graphql',
                kind: 2,
                startTimeUnixNano: '1751541577026000000',
                endTimeUnixNano: '1751541577027457584',
                attributes: [
                  {
                    key: 'http.method',
                    value: {
                      stringValue: 'GET',
                    },
                  },
                  {
                    key: 'http.url',
                    value: {
                      stringValue:
                        'http://localhost:4000/graphql?query=query+TopProductsOverview+%7B%0A++topProducts+%7B%0A++++name%0A++++upc%0A++++price%0A++++weight%0A++++reviews+%7B%0A++++++id%0A++++++body%0A++++++author+%7B%0A++++++++id%0A++++++++username%0A++++++++name%0A++++++%7D%0A++++%7D%0A++%7D%0A%7D',
                    },
                  },
                  {
                    key: 'http.route',
                    value: {
                      stringValue: '/graphql',
                    },
                  },
                  {
                    key: 'http.scheme',
                    value: {
                      stringValue: 'http:',
                    },
                  },
                  {
                    key: 'net.host.name',
                    value: {
                      stringValue: 'localhost',
                    },
                  },
                  {
                    key: 'http.host',
                    value: {
                      stringValue: 'localhost:4000',
                    },
                  },
                  {
                    key: 'http.user_agent',
                    value: {
                      stringValue:
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
                    },
                  },
                  {
                    key: 'http.status_code',
                    value: {
                      intValue: 200,
                    },
                  },
                  {
                    key: 'gateway.cache.response_cache',
                    value: {
                      stringValue: 'miss',
                    },
                  },
                ],
                droppedAttributesCount: 0,
                events: [],
                droppedEventsCount: 0,
                status: {
                  code: 1,
                },
                links: [],
                droppedLinksCount: 0,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    resourceSpans: [
      {
        resource: {
          attributes: [
            {
              key: 'service.name',
              value: {
                stringValue: 'hive-gateway',
              },
            },
            {
              key: 'service.version',
              value: {
                stringValue: '5.13.4',
              },
            },
          ],
          droppedAttributesCount: 0,
        },
        scopeSpans: [
          {
            scope: {
              name: 'gateway',
            },
            spans: [
              {
                traceId: '6045da1fe92d42a36f0ffdcca55efa46',
                spanId: '17fd8c5b3d731702',
                parentSpanId: 'b763ec1ad8a305ca',
                name: 'http.fetch',
                kind: 3,
                startTimeUnixNano: '1751541577186000000',
                endTimeUnixNano: '1751541577337256209',
                attributes: [],
                droppedAttributesCount: 0,
                events: [],
                droppedEventsCount: 0,
                status: {
                  code: 0,
                },
                links: [],
                droppedLinksCount: 0,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    resourceSpans: [
      {
        resource: {
          attributes: [
            {
              key: 'service.name',
              value: {
                stringValue: 'hive-gateway',
              },
            },
            {
              key: 'service.version',
              value: {
                stringValue: '5.13.4',
              },
            },
          ],
          droppedAttributesCount: 0,
        },
        scopeSpans: [
          {
            scope: {
              name: 'gateway',
            },
            spans: [
              {
                traceId: '6045da1fe92d42a36f0ffdcca55efa46',
                spanId: 'b763ec1ad8a305ca',
                name: 'gateway.initialization',
                kind: 1,
                startTimeUnixNano: '1751541567757845981',
                endTimeUnixNano: '1751541577382000000',
                attributes: [
                  {
                    key: 'http.method',
                    value: {
                      stringValue: 'GET',
                    },
                  },
                  {
                    key: 'http.url',
                    value: {
                      stringValue:
                        'http://host.docker.internal:3001/artifacts/v1/219fedb6-8a9b-44d7-929f-b0b16750653c/supergraph',
                    },
                  },
                  {
                    key: 'net.host.name',
                    value: {
                      stringValue: 'host.docker.internal',
                    },
                  },
                  {
                    key: 'http.host',
                    value: {
                      stringValue: 'host.docker.internal:3001',
                    },
                  },
                  {
                    key: 'http.route',
                    value: {
                      stringValue: '/artifacts/v1/219fedb6-8a9b-44d7-929f-b0b16750653c/supergraph',
                    },
                  },
                  {
                    key: 'http.scheme',
                    value: {
                      stringValue: 'http:',
                    },
                  },
                  {
                    key: 'http.status_code',
                    value: {
                      intValue: 200,
                    },
                  },
                ],
                droppedAttributesCount: 0,
                events: [],
                droppedEventsCount: 0,
                status: {
                  code: 1,
                },
                links: [],
                droppedLinksCount: 0,
              },
              {
                traceId: 'f42cb37f3811f650f06ca078e7c6625f',
                spanId: 'c55a1a27cfe0a563',
                parentSpanId: '6df96e8ebb5f3dd7',
                name: 'graphql.parse',
                kind: 1,
                startTimeUnixNano: '1751541577384000000',
                endTimeUnixNano: '1751541577385261166',
                attributes: [
                  {
                    key: 'graphql.document',
                    value: {
                      stringValue:
                        'query IntrospectionQuery{__schema{description queryType{name kind}mutationType{name kind}subscriptionType{name kind}types{...FullType}directives{name description locations args(includeDeprecated:true){...InputValue}}}}fragment FullType on __Type{kind name description fields(includeDeprecated:true){name description args(includeDeprecated:true){...InputValue}type{...TypeRef}isDeprecated deprecationReason}inputFields(includeDeprecated:true){...InputValue}interfaces{...TypeRef}enumValues(includeDeprecated:true){name description isDeprecated deprecationReason}possibleTypes{...TypeRef}}fragment InputValue on __InputValue{name description type{...TypeRef}defaultValue isDeprecated deprecationReason}fragment TypeRef on __Type{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name}}}}}}}}}}',
                    },
                  },
                  {
                    key: 'graphql.operation.name',
                    value: {
                      stringValue: 'IntrospectionQuery',
                    },
                  },
                ],
                droppedAttributesCount: 0,
                events: [],
                droppedEventsCount: 0,
                status: {
                  code: 0,
                },
                links: [],
                droppedLinksCount: 0,
              },
              {
                traceId: 'f42cb37f3811f650f06ca078e7c6625f',
                spanId: 'ca97bb80da3c0dbe',
                parentSpanId: '6df96e8ebb5f3dd7',
                name: 'graphql.validate',
                kind: 1,
                startTimeUnixNano: '1751541577385000000',
                endTimeUnixNano: '1751541577397343958',
                attributes: [
                  {
                    key: 'graphql.document',
                    value: {
                      stringValue:
                        'query IntrospectionQuery{__schema{description queryType{name kind}mutationType{name kind}subscriptionType{name kind}types{...FullType}directives{name description locations args(includeDeprecated:true){...InputValue}}}}fragment FullType on __Type{kind name description fields(includeDeprecated:true){name description args(includeDeprecated:true){...InputValue}type{...TypeRef}isDeprecated deprecationReason}inputFields(includeDeprecated:true){...InputValue}interfaces{...TypeRef}enumValues(includeDeprecated:true){name description isDeprecated deprecationReason}possibleTypes{...TypeRef}}fragment InputValue on __InputValue{name description type{...TypeRef}defaultValue isDeprecated deprecationReason}fragment TypeRef on __Type{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name}}}}}}}}}}',
                    },
                  },
                  {
                    key: 'graphql.operation.name',
                    value: {
                      stringValue: 'IntrospectionQuery',
                    },
                  },
                ],
                droppedAttributesCount: 0,
                events: [],
                droppedEventsCount: 0,
                status: {
                  code: 0,
                },
                links: [],
                droppedLinksCount: 0,
              },
              {
                traceId: 'f42cb37f3811f650f06ca078e7c6625f',
                spanId: '697d38f300df2167',
                parentSpanId: '6df96e8ebb5f3dd7',
                name: 'graphql.context',
                kind: 1,
                startTimeUnixNano: '1751541577398000000',
                endTimeUnixNano: '1751541577399414208',
                attributes: [],
                droppedAttributesCount: 0,
                events: [],
                droppedEventsCount: 0,
                status: {
                  code: 0,
                },
                links: [],
                droppedLinksCount: 0,
              },
              {
                traceId: 'f42cb37f3811f650f06ca078e7c6625f',
                spanId: 'f479d33b7320cd0f',
                parentSpanId: '6df96e8ebb5f3dd7',
                name: 'graphql.execute',
                kind: 1,
                startTimeUnixNano: '1751541577400000000',
                endTimeUnixNano: '1751541577410081959',
                attributes: [
                  {
                    key: 'graphql.operation.type',
                    value: {
                      stringValue: 'query',
                    },
                  },
                  {
                    key: 'graphql.operation.name',
                    value: {
                      stringValue: 'IntrospectionQuery',
                    },
                  },
                  {
                    key: 'graphql.document',
                    value: {
                      stringValue:
                        'query IntrospectionQuery{__schema{description queryType{name kind}mutationType{name kind}subscriptionType{name kind}types{...FullType}directives{name description locations args(includeDeprecated:true){...InputValue}}}}fragment FullType on __Type{kind name description fields(includeDeprecated:true){name description args(includeDeprecated:true){...InputValue}type{...TypeRef}isDeprecated deprecationReason}inputFields(includeDeprecated:true){...InputValue}interfaces{...TypeRef}enumValues(includeDeprecated:true){name description isDeprecated deprecationReason}possibleTypes{...TypeRef}}fragment InputValue on __InputValue{name description type{...TypeRef}defaultValue isDeprecated deprecationReason}fragment TypeRef on __Type{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name}}}}}}}}}}',
                    },
                  },
                ],
                droppedAttributesCount: 0,
                events: [],
                droppedEventsCount: 0,
                status: {
                  code: 0,
                },
                links: [],
                droppedLinksCount: 0,
              },
              {
                traceId: 'f42cb37f3811f650f06ca078e7c6625f',
                spanId: '6df96e8ebb5f3dd7',
                parentSpanId: 'af8929e2e40e00af',
                name: 'graphql.operation IntrospectionQuery',
                kind: 1,
                startTimeUnixNano: '1751541577382000000',
                endTimeUnixNano: '1751541577409557042',
                attributes: [
                  {
                    key: 'graphql.document',
                    value: {
                      stringValue:
                        'query IntrospectionQuery{__schema{description queryType{name kind}mutationType{name kind}subscriptionType{name kind}types{...FullType}directives{name description locations args(includeDeprecated:true){...InputValue}}}}fragment FullType on __Type{kind name description fields(includeDeprecated:true){name description args(includeDeprecated:true){...InputValue}type{...TypeRef}isDeprecated deprecationReason}inputFields(includeDeprecated:true){...InputValue}interfaces{...TypeRef}enumValues(includeDeprecated:true){name description isDeprecated deprecationReason}possibleTypes{...TypeRef}}fragment InputValue on __InputValue{name description type{...TypeRef}defaultValue isDeprecated deprecationReason}fragment TypeRef on __Type{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name}}}}}}}}}}',
                    },
                  },
                  {
                    key: 'graphql.operation.name',
                    value: {
                      stringValue: 'IntrospectionQuery',
                    },
                  },
                  {
                    key: 'graphql.operation.type',
                    value: {
                      stringValue: 'query',
                    },
                  },
                  {
                    key: 'gateway.cache.response_cache',
                    value: {
                      stringValue: 'miss',
                    },
                  },
                ],
                droppedAttributesCount: 0,
                events: [],
                droppedEventsCount: 0,
                status: {
                  code: 0,
                },
                links: [],
                droppedLinksCount: 0,
              },
              {
                traceId: 'f42cb37f3811f650f06ca078e7c6625f',
                spanId: 'af8929e2e40e00af',
                name: 'query IntrospectionQuery',
                kind: 2,
                startTimeUnixNano: '1751541577154000000',
                endTimeUnixNano: '1751541577412387709',
                attributes: [
                  {
                    key: 'http.method',
                    value: {
                      stringValue: 'POST',
                    },
                  },
                  {
                    key: 'http.url',
                    value: {
                      stringValue: 'http://localhost:4000/graphql',
                    },
                  },
                  {
                    key: 'http.route',
                    value: {
                      stringValue: '/graphql',
                    },
                  },
                  {
                    key: 'http.scheme',
                    value: {
                      stringValue: 'http:',
                    },
                  },
                  {
                    key: 'net.host.name',
                    value: {
                      stringValue: 'localhost',
                    },
                  },
                  {
                    key: 'http.host',
                    value: {
                      stringValue: 'localhost:4000',
                    },
                  },
                  {
                    key: 'http.user_agent',
                    value: {
                      stringValue:
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
                    },
                  },
                  {
                    key: 'hive.graphql.operation.type',
                    value: {
                      stringValue: 'query',
                    },
                  },
                  {
                    key: 'hive.graphql.operation.name',
                    value: {
                      stringValue: 'IntrospectionQuery',
                    },
                  },
                  {
                    key: 'hive.graphql.operation.document',
                    value: {
                      stringValue:
                        'query IntrospectionQuery{__schema{description queryType{name kind}mutationType{name kind}subscriptionType{name kind}types{...FullType}directives{name description locations args(includeDeprecated:true){...InputValue}}}}fragment FullType on __Type{kind name description fields(includeDeprecated:true){name description args(includeDeprecated:true){...InputValue}type{...TypeRef}isDeprecated deprecationReason}inputFields(includeDeprecated:true){...InputValue}interfaces{...TypeRef}enumValues(includeDeprecated:true){name description isDeprecated deprecationReason}possibleTypes{...TypeRef}}fragment InputValue on __InputValue{name description type{...TypeRef}defaultValue isDeprecated deprecationReason}fragment TypeRef on __Type{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name ofType{kind name}}}}}}}}}}',
                    },
                  },
                  {
                    key: 'hive.graphql.error.count',
                    value: {
                      intValue: 0,
                    },
                  },
                  {
                    key: 'http.status_code',
                    value: {
                      intValue: 200,
                    },
                  },
                  {
                    key: 'gateway.cache.response_cache',
                    value: {
                      stringValue: 'miss',
                    },
                  },
                ],
                droppedAttributesCount: 0,
                events: [],
                droppedEventsCount: 0,
                status: {
                  code: 1,
                },
                links: [],
                droppedLinksCount: 0,
              },
            ],
          },
        ],
      },
    ],
  },
];

type Reference = typeof reference;

function randomId(len = 32) {
  return crypto.randomBytes(len / 2).toString('hex');
}

function toTimeUnixNano(date = new Date()) {
  const milliseconds = date.getTime(); // ms since epoch
  const nanoseconds = BigInt(milliseconds) * 1_000_000n; // ns = ms × 1_000_000
  return nanoseconds;
}

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
    for (const span of payload.resourceSpans[0].scopeSpans[0].spans) {
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
      span.startTimeUnixNano = newScreateTracetartTime.toString();
      span.endTimeUnixNano = (newStartTime + spanDuration).toString();

      // TODO figure out a way to ranomly add errors
    }
  }
}

function createTrace(date: Date, reference: Reference) {
  return immer.produce(reference, draft => mutate(date, draft));
}

const __dirname = import.meta.dirname;

const seedFolder = path.join(__dirname);

const files = await fs.readdir(seedFolder);

const references: Array<Reference> = [];

console.log(`Load samples from the '${seedFolder}' folder.`);
for (const file of files) {
  if (!file.startsWith('sample-') || !file.endsWith('.json')) {
    console.log('Skip ' + file);
    continue;
  }
  console.log('Load' + file);
  references.push(JSON.parse(await fs.readFile(path.join(seedFolder, file), 'utf-8')));
}

console.log(`Loaded ${references.length} references.`);

if (references.length === 0) {
  throw new Error('No references where found.');
}

const USAGE_DAYS = process.env.USAGE_DAYS || '14';
console.log(
  `Seeding usage for the last ${USAGE_DAYS} day(s). (Overwrite using the USAGE_DAYS environment variable)`,
);
const USAGE_INTERVAL = process.env.USAGE_INTERVAL || '20';
console.log(
  `Seeding every ${USAGE_INTERVAL} minute(s). (Overwrite using the USAGE_INTERVAL environment variable)`,
);

const otelEndpointUrl = process.env.OTEL_ENDPOINT || 'http://localhost:4318/v1/traces';
console.log(
  `Endpoint: ${otelEndpointUrl}. (Overwrite using the OTEL_ENDPOINT environment variable)`,
);

const HIVE_ORGANIZATION_ACCESS_TOKEN = process.env.HIVE_ORGANIZATION_ACCESS_TOKEN;
if (!HIVE_ORGANIZATION_ACCESS_TOKEN) {
  throw new Error('Environment variable HIVE_ORGANIZATION_ACCESS_TOKEN is missing.');
}

const HIVE_TARGET_REF = process.env.HIVE_TARGET_REF;
if (!HIVE_TARGET_REF) {
  throw new Error('Environment variable HIVE_TARGET_REF is missing.');
}

const intervalMinutes = parseInt(USAGE_INTERVAL, 10);
const usageDays = parseInt(USAGE_DAYS, 10);
const now = new Date();
let currentDate = date.subDays(now, usageDays);

while (currentDate.getTime() < now.getTime()) {
  console.log(currentDate.toISOString());

  const promises: Array<Promise<unknown>> = [];

  for (const reference of references) {
    const tracePayloads = createTrace(currentDate, reference);
    for (let i = randomInt(10); i > 0; i--) {
      promises.push(
        ...tracePayloads.map(body =>
          fetch(otelEndpointUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${HIVE_ORGANIZATION_ACCESS_TOKEN}`,
              'X-Hive-Target-Ref': HIVE_TARGET_REF,
            },
            body: JSON.stringify(body),
          }).then(res => {
            if (!res.ok) {
              throw new Error('Something went wrong');
            }

            return null;
          }),
        ),
      );
    }
  }

  await Promise.all(promises);

  currentDate = date.addMinutes(currentDate, intervalMinutes);
}

function randomInt(until = 10) {
  return Math.floor(Math.random() * (until + 1));
}
