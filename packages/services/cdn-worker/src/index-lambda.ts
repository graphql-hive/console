import type { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { createServerAdapter } from '@whatwg-node/server';
import { createArtifactRequestHandler } from './artifact-handler';
import { ArtifactStorageReader } from './artifact-storage-reader';
import { AwsClient, type AwsCredentials } from './aws';
import { createIsAppDeploymentActive } from './is-app-deployment-active';
import { createIsKeyValid } from './key-validation';
import { createOciRequestHandler, isOciPath, isOciRequest } from './oci-handler';

const env = z
  .object({
    AWS_S3_IAM_AUTH_ENABLED: z.enum(['0', '1']).default('0'),
    AWS_S3_ACCESS_KEY_ID: z.string().optional(),
    AWS_S3_ACCESSS_KEY_SECRET: z.string().optional(),
    AWS_S3_ENDPOINT: z.string(),
    AWS_S3_BUCKET_NAME: z.string(),
    OCI_SUPERGRAPH_ENABLED: z.enum(['0', '1']).default('0'),
  })
  .parse((globalThis as any).process.env);

let getCredentials: () => Promise<AwsCredentials>;

if (env.AWS_S3_IAM_AUTH_ENABLED === '1') {
  getCredentials = fromNodeProviderChain();
} else {
  if (!env.AWS_S3_ACCESS_KEY_ID || !env.AWS_S3_ACCESSS_KEY_SECRET) {
    throw new Error(
      'AWS_S3_ACCESS_KEY_ID and AWS_S3_ACCESSS_KEY_SECRET are required when AWS_S3_IAM_AUTH_ENABLED is false',
    );
  }

  const credentials: AwsCredentials = {
    accessKeyId: env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_S3_ACCESSS_KEY_SECRET,
  };

  getCredentials = async () => {
    return credentials;
  };
}

const s3 = {
  client: new AwsClient({
    credentialProvider: {
      getCredentials,
    },
    service: 's3',
  }),
  endpoint: env.AWS_S3_ENDPOINT,
  bucketName: env.AWS_S3_BUCKET_NAME,
};

const s3Mirror = null;

const artifactStorageReader = new ArtifactStorageReader(s3, s3Mirror, null, null);

const isKeyValid = createIsKeyValid({
  artifactStorageReader,
  analytics: null,
  breadcrumb(message: string) {
    console.log(message);
  },
  getCache: null,
  waitUntil: null,
  captureException() {},
});

const artifactHandler = createArtifactRequestHandler({
  isKeyValid,
  artifactStorageReader,
  isAppDeploymentActive: createIsAppDeploymentActive({
    artifactStorageReader,
    getCache: null,
    waitUntil: null,
  }),
});

/** Whether the OCI Distribution API (`/v2/`) for supergraph images is served. */
const ociEnabled = env.OCI_SUPERGRAPH_ENABLED === '1';

const ociHandler = createOciRequestHandler({
  isKeyValid,
  storage: artifactStorageReader,
});

const artifactRouteHandler = createServerAdapter(((request: Request) =>
  ociEnabled && isOciRequest(request) ? ociHandler(request) : artifactHandler(request)) as any);

/**
 * Node.js `Buffer`, which is available in the Lambda runtime. Accessed via `globalThis` because
 * this package is type checked against the Cloudflare Worker types.
 */
const NodeBuffer: {
  from(data: ArrayBuffer): { toString(encoding: 'base64'): string };
} = (globalThis as any).Buffer;

function tryParseEventUrl(rawPath: string): URL | null {
  try {
    return new URL(rawPath, 'http://localhost');
  } catch (e) {
    console.error(`Failed to parse URL: ${rawPath}`, e);
    return null;
  }
}

export async function handler(
  event: APIGatewayProxyEventV2,
  lambdaContext: Context,
): Promise<APIGatewayProxyResult> {
  console.log(event.requestContext.http.method, event.rawPath);
  const url = tryParseEventUrl(event.rawPath);

  if (!url) {
    return {
      statusCode: 400,
      body: 'Invalid URL',
      isBase64Encoded: false,
    };
  }

  if (event.queryStringParameters != null) {
    for (const name in event.queryStringParameters) {
      const value = event.queryStringParameters[name];
      if (value != null) {
        url.searchParams.set(name, value);
      }
    }
  }

  const response = await artifactRouteHandler.fetch(
    url,
    {
      method: event.requestContext.http.method,
      headers: event.headers as HeadersInit,
      body: undefined,
    },
    {
      event,
      lambdaContext,
    },
  );

  if (!response) {
    return {
      statusCode: 404,
      body: '',
      isBase64Encoded: false,
    };
  }

  const responseHeaders: Record<string, string> = {};

  response.headers.forEach((value, name) => {
    responseHeaders[name] = value;
  });

  // OCI blobs are binary (gzip), so they are passed base64 encoded.
  if (ociEnabled && isOciPath(url.pathname)) {
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: NodeBuffer.from(await response.arrayBuffer()).toString('base64'),
      isBase64Encoded: true,
    };
  }

  return {
    statusCode: response.status,
    headers: responseHeaders,
    body: await response.text(),
    isBase64Encoded: false,
  };
}
