import { resolve } from 'node:path';
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { Environment } from './environment';
import { S3 } from './s3';

export function deployAWSArtifactsLambdaFunction(args: {
  environment: Environment;
  /** Note: We run this mirror only on the AWS S3 Bucket on purpose. */
  s3Mirror: S3;
}) {
  const lambdaRole = new aws.iam.Role('lambdaRole', {
    assumeRolePolicy: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'lambda.amazonaws.com' },
          Action: 'sts:AssumeRole',
        },
      ],
    },
  });

  const awsLambdaArtifactsHandler = new aws.lambda.Function('awsLambdaArtifactsHandler', {
    name: `hive-artifacts-handler-${args.environment.envName}`,
    runtime: aws.lambda.Runtime.NodeJS22dX,
    handler: 'index.worker.mjs',
    architectures: ['arm64'],
    code: new pulumi.asset.AssetArchive({
      'index.worker.mjs':
        process.env.AWS_LAMBDA_ARTIFACT_PATH ||
        resolve(__dirname, '../../packages/services/cdn-worker/dist/index.worker.mjs'),
    }),
    role: lambdaRole.arn,
    region: 'us-east-2',
    environment: {
      variables: {
        // yeah this is illegal but I frist need to figure out how to use secret store or some stuff
        AWS_S3_ENDPOINT: args.s3Mirror.secret.raw.endpoint,
        AWS_S3_BUCKET_NAME: args.s3Mirror.secret.raw.bucket,
        AWS_S3_ACCESS_KEY_ID: args.s3Mirror.secret.raw.accessKeyId,
        AWS_S3_ACCESSS_KEY_SECRET: args.s3Mirror.secret.raw.secretAccessKey,
      },
    },
    // 448mb
    memorySize: 448,
    // 10 seconds
    timeout: 10,
  });

  const example = new aws.lambda.FunctionUrl('example', {
    functionName: awsLambdaArtifactsHandler.name,
    qualifier: args.environment.envVars.RELEASE,
    authorizationType: 'NONE',
    invokeMode: 'BUFFERED',
  });

  return {
    functionUrl: example.functionUrl,
  };
}
