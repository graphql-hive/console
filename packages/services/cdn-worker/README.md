## Hive CDN Worker

Hive comes with a CDN worker (deployed to CF Workers), along with KV cache to storage.

### Standalone Development

To run Hive CDN locally, you can use the following command: `pnpm dev`.

> Note: during dev, KV is mocked using JS `Map`, so it's ephemeral and will be deleted with any
> change in code.

To publish manually a schema, for target id `1`:

```sh
curl -X PUT http://localhost:4010/1/storage/kv/namespaces/2/values/target:1:schema --data-raw '{"sdl": "type Query { foo: String }" }' -H 'content-type: text/plain'
```

You can also use the following to dump everything stored in the mocked KV:

```sh
curl http://localhost:4010/dump
```

To fetch a specific resource, for target id `1`, run one of the following:

```sh
curl http://localhost:4010/1/schema -H "x-hive-cdn-key: fake"
curl http://localhost:4010/1/sdl -H "x-hive-cdn-key: fake"
curl http://localhost:4010/1/introspection -H "x-hive-cdn-key: fake"
```

> Hive CDN Auth and access management is not enforced AT ALL during development.

### Local Development with Hive Server

Hive server has `CF_BASE_PATH` env var that tells is where to send the published schemas.

To connect your server to the local, mocked CDN, make sure you have the following in
`packages/server/.env`:

```dotenv
CF_BASE_PATH=http://localhost:4010
```

This way, your local Hive instance will be able to send schema to the locally running CDN Worker.

### Deployment

There is two variants being built that can be deployed independently.

- `Cloudflare Worker`: `dist/index.worker.mjs`
- `AWS Lambda`: `dist/index.lambda.mjs`

#### Cloudflare Worker

THe documentation is work in progress and will be improved in the future.

```
type Env = {
  S3_ENDPOINT: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_BUCKET_NAME: string;
  S3_SESSION_TOKEN?: string;

  S3_MIRROR_ENDPOINT: string;
  S3_MIRROR_ACCESS_KEY_ID: string;
  S3_MIRROR_SECRET_ACCESS_KEY: string;
  S3_MIRROR_BUCKET_NAME: string;
  S3_MIRROR_SESSION_TOKEN?: string;

  SENTRY_DSN: string;
  /**
   * Name of the environment, e.g. staging, production
   */
  SENTRY_ENVIRONMENT: string;
  /**
   * Id of the release
   */
  SENTRY_RELEASE: string;
  /**
   * Worker's Analytics Engines
   */
  USAGE_ANALYTICS: AnalyticsEngine;
  ERROR_ANALYTICS: AnalyticsEngine;
  RESPONSE_ANALYTICS: AnalyticsEngine;
  R2_ANALYTICS: AnalyticsEngine;
  S3_ANALYTICS: AnalyticsEngine;
  KEY_VALIDATION_ANALYTICS: AnalyticsEngine;
  /**
   * Base URL of the KV storage, used to fetch the schema from the KV storage.
   * If not provided, the schema will be fetched from default KV storage value.
   *
   * @default https://key-cache.graphql-hive.com
   */
  KV_STORAGE_BASE_URL?: string;
};
```

#### AWS Lambda

**Runtime**: Node.js 22.x

| Name                        | Required | Description                          | Example Value |
| --------------------------- | -------- | ------------------------------------ | ------------- |
| `AWS_S3_ACCESS_KEY_ID`      | **Yes**  | The port this service is running on. | `4013`        |
| `AWS_S3_ACCESSS_KEY_SECRET` | **Yes**  | The port this service is running on. | `4013`        |
| `AWS_S3_ACCESS_ENDPOINT`    | **Yes**  | The port this service is running on. | `4013`        |
| `AWS_S3_BUCKET_NAME`        | **Yes**  | The port this service is running on. | `4013`        |

All other configuration options available for Cloudflare Workers are currently not supported.

We recommend deploying the function to AWS Lambda, create a AWS Lambda Function invocation URL and
then add the function as origin to CloudFront.
