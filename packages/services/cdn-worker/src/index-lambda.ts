import type { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createServerAdapter } from '@whatwg-node/server';
import { createArtifactRequestHandler } from './artifact-handler';
import { ArtifactStorageReader } from './artifact-storage-reader';
import { AwsClient } from './aws';
import { createIsAppDeploymentActive } from './is-app-deployment-active';
import { createIsKeyValid } from './key-validation';

const process = (globalThis as any).process;

const s3 = {
  client: new AwsClient({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_ACCESSS_KEY_SECRET,
    service: 's3',
  }),
  endpoint: process.env.AWS_S3_ACCESS_ENDPOINT,
  bucketName: process.env.AWS_S3_BUCKET_NAME,
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
    captureException(error) {
      // captureException(error, {
      //   extra: {
      //     source: 'artifactRequestHandler',
      //   },
      // });
    },
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
  event: APIGatewayEvent,
  lambdaContext: Context,
): Promise<APIGatewayProxyResult> {
  const url = new URL(event.path, 'http://localhost');
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
      method: event.httpMethod,
      headers: event.headers as HeadersInit,
      body: undefined,
    },
    {
      event,
      lambdaContext,
    },
  );

  console.log(response);

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
