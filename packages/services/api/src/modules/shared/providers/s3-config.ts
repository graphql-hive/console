import { Injectable, Scope } from 'graphql-modules';
import type { AwsClient } from '../../cdn/providers/aws';

type AtLeastOneReadonlyArray<T> = readonly [T, ...T[]];

export type S3Destination = {
  client: AwsClient;
  endpoint: string;
  bucket: string;
};

/**
 * S3 bucket storage configurations for dual writes to a primary and secondary destination.
 */
@Injectable({ scope: Scope.Singleton, global: true })
export class S3Config {
  constructor(public destinations: AtLeastOneReadonlyArray<S3Destination>) {}
}
