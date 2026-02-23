import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { Environment } from './environment';
import { S3 } from './s3';

// We do this here in order to fail early if the file is missing
const LAMBDA_ARTIFACT_CONTENT = readFileSync(
  process.env.AWS_LAMBDA_ARTIFACT_PATH ||
    resolve(__dirname, '../../packages/services/cdn-worker/dist/index.lambda.mjs'),
  'utf-8',
);

export function deployAWSArtifactsLambdaFunction(args: {
  environment: Environment;
  /** Note: We run this mirror only on the AWS S3 Bucket on purpose. */
  s3Mirror: S3;
}) {
  const lambdaRole = new aws.iam.Role('awsLambdaArtifactsHandlerRole', {
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

  new aws.iam.RolePolicyAttachment('lambdaBasicExecution', {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
  });

  const awsLambdaArtifactsHandler = new aws.lambda.Function('awsLambdaArtifactsHandler', {
    name: `hive-artifacts-handler-${args.environment.envName}`,
    runtime: aws.lambda.Runtime.NodeJS22dX,
    handler: 'index.handler',
    packageType: 'Zip',
    architectures: ['arm64'],
    code: new pulumi.asset.AssetArchive({
      'index.mjs': new pulumi.asset.StringAsset(LAMBDA_ARTIFACT_CONTENT),
    }),
    role: lambdaRole.arn,
    environment: {
      variables: {
        // This could be done better with secrets manager etc.
        // But it adds a lot of complexity and overhead and runtime logic
        AWS_S3_ENDPOINT: args.s3Mirror.secret.raw.endpoint,
        AWS_S3_BUCKET_NAME: args.s3Mirror.secret.raw.bucket,
        AWS_S3_ACCESS_KEY_ID: args.s3Mirror.secret.raw.accessKeyId,
        AWS_S3_ACCESSS_KEY_SECRET: args.s3Mirror.secret.raw.secretAccessKey,
      },
    },
    memorySize: args.environment.resources.cdnAwsMirror.memory,
    timeout: args.environment.resources.cdnAwsMirror.executionTimeout,
  });

  const example = new aws.lambda.FunctionUrl('awsLambdaArtifactsHandlerUrl', {
    functionName: awsLambdaArtifactsHandler.arn,
    authorizationType: 'NONE',
    invokeMode: 'BUFFERED',
  });

  return {
    functionUrl: example.functionUrl,
  };
}
