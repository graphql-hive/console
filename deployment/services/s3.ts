import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { ServiceSecret } from '../utils/secrets';

/** increment for rotation */
const S3_ACCESS_KEY_VERSION = 1;

export class S3Secret extends ServiceSecret<{
  accessKeyId: string | pulumi.Output<string>;
  secretAccessKey: string | pulumi.Output<string>;
  endpoint: string | pulumi.Output<string>;
  bucket: string | pulumi.Output<string>;
}> {}

export function deployS3() {
  const r2Config = new pulumi.Config('r2');

  const secret = new S3Secret('cloudflare-r2', {
    endpoint: r2Config.require('endpoint'),
    bucket: r2Config.require('bucketName'),
    accessKeyId: r2Config.requireSecret('accessKeyId'),
    secretAccessKey: r2Config.requireSecret('secretAccessKey'),
  });

  return { secret };
}

export function deployS3Mirror() {
  const s3Config = new pulumi.Config('s3');
  const bucket = s3Config.require('bucketName');

  const readWriteUser = new aws.iam.User('aws-s3-read-write');

  const readWritePolicy = new aws.iam.UserPolicy('aws-s3-read-write', {
    user: readWriteUser.name,
    policy: createBucketPolicy(bucket, [
      's3:DeleteObject',
      's3:GetObject',
      's3:ListBucket',
      's3:PutObject',
    ]),
  });

  const readWriteAccessKey = new aws.iam.AccessKey(
    `aws-s3-read-write-${S3_ACCESS_KEY_VERSION}`,
    { user: readWriteUser.name },
    { dependsOn: readWritePolicy, retainOnDelete: true },
  );

  const readOnlyUser = new aws.iam.User('aws-s3-read-only');

  const readOnlyPolicy = new aws.iam.UserPolicy('aws-s3-read-only', {
    user: readOnlyUser.name,
    policy: createBucketPolicy(bucket, ['s3:GetObject', 's3:ListBucket']),
  });

  const readOnlyAccessKey = new aws.iam.AccessKey(
    `aws-s3-read-only-${S3_ACCESS_KEY_VERSION}`,
    { user: readOnlyUser.name },
    { dependsOn: readOnlyPolicy, retainOnDelete: true },
  );

  const readWriteSecret = new S3Secret('aws-s3', {
    endpoint: s3Config.require('endpoint'),
    bucket,
    accessKeyId: readWriteAccessKey.id,
    secretAccessKey: readWriteAccessKey.secret,
  });

  const readOnlySecret = new S3Secret('aws-s3-read-only', {
    endpoint: s3Config.require('endpoint'),
    bucket,
    accessKeyId: readOnlyAccessKey.id,
    secretAccessKey: readOnlyAccessKey.secret,
  });

  return {
    readWriteSecret,
    readOnlySecret,
    accessKeys: {
      readWriteId: readWriteAccessKey.id,
      readOnlyId: readOnlyAccessKey.id,
    },
  };
}

function createBucketPolicy(bucket: string, actions: string[]) {
  return pulumi.jsonStringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: actions,
        Resource: [
          pulumi.interpolate`arn:aws:s3:::${bucket}`,
          pulumi.interpolate`arn:aws:s3:::${bucket}/*`,
        ],
      },
    ],
  });
}

export function deployS3AuditLog() {
  const config = new pulumi.Config('audit-log-s3');

  const secret = new S3Secret('audit-log-s3', {
    endpoint: config.require('endpoint'),
    bucket: config.require('bucketName'),
    accessKeyId: config.requireSecret('accessKeyId'),
    secretAccessKey: config.requireSecret('secretAccessKey'),
  });

  return { secret };
}

export type S3 = ReturnType<typeof deployS3>;
export type S3Mirror = ReturnType<typeof deployS3Mirror>;
