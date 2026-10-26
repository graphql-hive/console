import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { ServiceSecret } from '../utils/secrets';

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
  const accessKey = new aws.iam.AccessKey(
    'aws-s3-access-key',
    {
      user: s3Config.require('iamUserName'),
    },
    {
      additionalSecretOutputs: ['secret'],
      replacementTrigger: s3Config.require('credentialDeploymentToken'),
      retainOnDelete: true,
    },
  );

  const secret = new S3Secret('aws-s3', {
    endpoint: s3Config.require('endpoint'),
    bucket: s3Config.require('bucketName'),
    accessKeyId: accessKey.id,
    secretAccessKey: accessKey.secret,
  });

  return { secret };
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
