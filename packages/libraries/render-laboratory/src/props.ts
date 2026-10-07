import type { GraphiQLOptions } from 'graphql-yoga';
import type { LaboratoryCollection, LaboratoryProps } from '@graphql-hive/laboratory';

type LaboratoryOptions = {
  defaultCollections?: LaboratoryCollection[];
};

export type RenderLaboratoryOptions = GraphiQLOptions & LaboratoryOptions;

export const mapGraphiQLOptionsToLaboratoryProps = (
  opts?: RenderLaboratoryOptions,
): LaboratoryProps => {
  if (!opts) {
    return { enableDocs: true };
  }

  return {
    enableDocs: true,
    defaultSettings: {
      fetch: {
        credentials: opts.credentials ?? 'same-origin',
        timeout: opts.timeout,
        useGETForQueries: opts.useGETForQueries,
      },
      subscriptions: {
        protocol: opts.subscriptionsProtocol ?? 'WS',
      },
      introspection: {
        method: opts.method,
      },
    },
    defaultCollections: opts.defaultCollections,
    defaultEndpoint: opts.endpoint,
  } satisfies LaboratoryProps;
};
