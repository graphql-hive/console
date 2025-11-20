import type { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { createServerAdapter } from '@whatwg-node/server';
import { createArtifactRequestHandler } from './artifact-handler';
import { ArtifactStorageReader } from './artifact-storage-reader';
import { AwsClient } from './aws';
import { createIsAppDeploymentActive } from './is-app-deployment-active';
import { createIsKeyValid } from './key-validation';

const env = z
  .object({
    AWS_S3_ACCESS_KEY_ID: z.string(),
    AWS_S3_ACCESSS_KEY_SECRET: z.string(),
    AWS_S3_ACCESS_ENDPOINT: z.string(),
    AWS_S3_BUCKET_NAME: z.string(),
  })
  .parse((globalThis as any).process.env);

const s3 = {
  client: new AwsClient({
    accessKeyId: env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_S3_ACCESSS_KEY_SECRET,
    service: 's3',
  }),
  endpoint: env.AWS_S3_ACCESS_ENDPOINT,
  bucketName: env.AWS_S3_BUCKET_NAME,
};

const s3Mirror = null;

const artifactStorageReader = new ArtifactStorageReader(s3, s3Mirror, null, null);

const artifactHandler = createArtifactRequestHandler({
  isKeyValid: createIsKeyValid({
    artifactStorageReader,
    analytics: null,
    breadcrumb(message: string) {
      console.log(message);
    },
    getCache: null,
    waitUntil: null,
    captureException() {},
  }),
  artifactStorageReader,
  isAppDeploymentActive: createIsAppDeploymentActive({
    artifactStorageReader,
    getCache: null,
    waitUntil: null,
  }),
});

const artifactRouteHandler = createServerAdapter(artifactHandler as any);

export async function handler(
  event: APIGatewayProxyEventV2,
  lambdaContext: Context,
): Promise<APIGatewayProxyResult> {
  console.log(event.requestContext.http.method, event.rawPath);
  const url = new URL(event.rawPath, 'http://localhost');
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

  return {
    statusCode: response.status,
    headers: responseHeaders,
    body: await response.text(),
    isBase64Encoded: false,
  };
}
