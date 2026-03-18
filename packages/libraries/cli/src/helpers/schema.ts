import { concatAST, parse, print, stripIgnoredCharacters } from 'graphql';
import { LegacyLogger } from '@graphql-hive/core/typings/client/types';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { JsonFileLoader } from '@graphql-tools/json-file-loader';
import { loadTypedefs } from '@graphql-tools/load';
import { UrlLoader } from '@graphql-tools/url-loader';
import type { BaseLoaderOptions, Loader, Source } from '@graphql-tools/utils';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { FragmentType, graphql, useFragment as unmaskFragment, useFragment } from '../gql';
import { SchemaWarningConnection, SeverityLevelType } from '../gql/graphql';
import { graphqlRequest } from './graphql-request';
import { Texture } from './texture/texture';

const severityLevelMap: Record<SeverityLevelType, string> = {
  [SeverityLevelType.Breaking]: Texture.colors.red('-'),
  [SeverityLevelType.Safe]: Texture.colors.green('-'),
  [SeverityLevelType.Dangerous]: Texture.colors.green('-'),
};

export const RenderErrors_SchemaErrorConnectionFragment = graphql(`
  fragment RenderErrors_SchemaErrorConnectionFragment on SchemaErrorConnection {
    edges {
      node {
        message
      }
    }
  }
`);

export const renderErrors = (
  errors: FragmentType<typeof RenderErrors_SchemaErrorConnectionFragment>,
) => {
  const e = useFragment(RenderErrors_SchemaErrorConnectionFragment, errors);
  const t = Texture.createBuilder();
  t.failure(`Detected ${e.edges.length} error${e.edges.length > 1 ? 's' : ''}`);
  t.line();
  e.edges.forEach(edge => {
    t.indent(Texture.colors.red('-') + ' ' + Texture.boldQuotedWords(edge.node.message));
  });
  return t.state.value;
};

const RenderChanges_SchemaChanges = graphql(`
  fragment RenderChanges_schemaChanges on SchemaChangeConnection {
    edges {
      node {
        severityLevel
        isSafeBasedOnUsage
        message(withSafeBasedOnUsageNote: false)
        approval {
          approvedBy {
            displayName
          }
        }
        affectedAppDeployments(first: 0) {
          totalCount
        }
      }
    }
  }
`);

export const renderChanges = (maskedChanges: FragmentType<typeof RenderChanges_SchemaChanges>) => {
  const t = Texture.createBuilder();
  const changes = unmaskFragment(RenderChanges_SchemaChanges, maskedChanges);
  type ChangeType = (typeof changes)['edges'][number]['node'];

  const writeChanges = (changes: ChangeType[]) => {
    changes.forEach(change => {
      const messageParts = [
        severityLevelMap[change.isSafeBasedOnUsage ? SeverityLevelType.Safe : change.severityLevel],
        Texture.boldQuotedWords(change.message),
      ];

      if (change.isSafeBasedOnUsage) {
        messageParts.push(Texture.colors.green('(Safe based on usage ✓)'));
      }
      if (change.approval) {
        messageParts.push(
          Texture.colors.green(
            `(Approved by ${change.approval.approvedBy?.displayName ?? '<unknown>'} ✓)`,
          ),
        );
      }
      if (change.affectedAppDeployments?.totalCount) {
        const count = change.affectedAppDeployments.totalCount;
        messageParts.push(
          Texture.colors.yellow(`[${count} app deployment${count !== 1 ? 's' : ''} affected]`),
        );
      }

      t.indent(messageParts.join(' '));
    });
  };

  t.info(`Detected ${changes.edges.length} change${changes.edges.length > 1 ? 's' : ''}`);
  t.line();

  const breakingChanges = changes.edges.filter(
    edge => edge.node.severityLevel === SeverityLevelType.Breaking,
  );
  const dangerousChanges = changes.edges.filter(
    edge => edge.node.severityLevel === SeverityLevelType.Dangerous,
  );
  const safeChanges = changes.edges.filter(
    edge => edge.node.severityLevel === SeverityLevelType.Safe,
  );

  const otherChanges = changes.edges.filter(
    edge => !Object.values(SeverityLevelType).includes(edge.node.severityLevel),
  );

  if (breakingChanges.length) {
    t.indent(`Breaking changes:`);
    writeChanges(breakingChanges.map(edge => edge.node));
  }

  if (dangerousChanges.length) {
    t.indent(`Dangerous changes:`);
    writeChanges(dangerousChanges.map(edge => edge.node));
  }

  if (safeChanges.length) {
    t.indent(`Safe changes:`);
    writeChanges(safeChanges.map(edge => edge.node));
  }

  // For backwards compatibility in case more severity levels are added.
  // This is unlikely to happen.
  if (otherChanges.length) {
    t.indent(`Other changes: (Current CLI version does not support these SeverityLevels)`);
    writeChanges(otherChanges.map(edge => edge.node));
  }

  return t.state.value;
};

export const renderWarnings = (warnings: SchemaWarningConnection) => {
  const t = Texture.createBuilder();
  t.line();
  t.warning(`Detected ${warnings.total} warning${warnings.total > 1 ? 's' : ''}`);
  t.line();

  warnings.nodes.forEach(warning => {
    const details = [
      warning.source ? `source: ${Texture.boldQuotedWords(warning.source)}` : undefined,
    ]
      .filter(Boolean)
      .join(', ');

    t.indent(`- ${Texture.boldQuotedWords(warning.message)}${details ? ` (${details})` : ''}`);
  });

  return t.state.value;
};

export async function loadSchema(
  /**
   * Behaviour for loading the schema from a HTTP endpoint.
   */
  httpLoadingIntent:
    | 'first-federation-then-graphql-introspection'
    | 'only-graphql-introspection'
    | 'only-federation-introspection'
    | null,
  file: string,
  options: {
    logger: LegacyLogger;
    headers?: Record<string, string>;
    method?: 'GET' | 'POST';
  },
) {
  const logger = options?.logger;
  const loaders: Loader[] = [];

  if (httpLoadingIntent === 'first-federation-then-graphql-introspection') {
    loaders.unshift(new FederationSubgraphIntrospectionThenGraphQLIntrospectionUrlLoader(logger));
  } else if (httpLoadingIntent === 'only-federation-introspection') {
    loaders.unshift(new FederationSubgraphUrlLoader(logger));
  } else if (httpLoadingIntent === 'only-graphql-introspection') {
    loaders.unshift(new UrlLoader());
  }

  loaders.push(new CodeFileLoader(), new GraphQLFileLoader(), new JsonFileLoader());

  const sources = await loadTypedefs(file, {
    ...options,
    cwd: process.cwd(),
    loaders,
  });

  return print(concatAST(sources.map(s => s.document!)));
}

export function minifySchema(schema: string): string {
  return stripIgnoredCharacters(schema);
}

class FederationSubgraphUrlLoader implements Loader {
  constructor(private logger?: LegacyLogger) {}

  async load(
    pointer: string,
    options?: BaseLoaderOptions & { headers?: Record<string, string> },
  ): Promise<Array<Source>> {
    if (!pointer.startsWith('http://') && !pointer.startsWith('https://')) {
      this.logger?.debug?.('Provided endpoint is not HTTP, skip introspection.');
      return [];
    }

    const client = graphqlRequest({
      logger: this.logger,
      endpoint: pointer,
      additionalHeaders: {
        ...options?.headers,
      },
    });

    this.logger?.debug?.('Attempt "_Service" type lookup via "Query.__type".');

    // We can check if the schema is a subgraph by looking for the `_Service` type.
    const isSubgraph = await client.request({
      operation: parse(/* GraphQL */ `
        query ${'LookupService'} {
          __type(name: "_Service") ${' '}{
            name
          }
        }
      `) as TypedDocumentNode<{ __type: null | { name: string } }, Record<string, never>>,
    });

    if (isSubgraph.__type === null) {
      this.logger?.debug?.('Type not found, this is not a Federation subgraph.');
      return [];
    }

    this.logger?.debug?.(
      'Resolved "_Service" type. Federation subgraph detected.' +
        'Attempt Federation introspection via "Query._service" field.',
    );

    const response = await client.request({
      operation: parse(/* GraphQL */ `
        query ${'GetFederationSchema'} {
          _service {
            sdl
          }
        }
      `) as TypedDocumentNode<{ _service: { sdl: string } }, Record<string, never>>,
    });

    this.logger?.debug?.('Resolved subgraph SDL successfully.');

    const sdl = minifySchema(response._service.sdl);

    return [
      {
        document: parse(sdl),
        rawSDL: sdl,
      },
    ];
  }
}

class FederationSubgraphIntrospectionThenGraphQLIntrospectionUrlLoader implements Loader {
  private urlLoader = new UrlLoader();
  private federationLoader: FederationSubgraphUrlLoader;
  constructor(private logger?: LegacyLogger) {
    this.federationLoader = new FederationSubgraphUrlLoader(logger);
  }

  async load(pointer: string, options: BaseLoaderOptions & { headers?: Record<string, string> }) {
    this.logger?.debug?.('Attempt federation introspection');
    let result = await this.federationLoader.load(pointer, options);
    if (!result.length) {
      this.logger?.debug?.('Attempt GraphQL introspection');
      result = await this.urlLoader.load(pointer, options);
    }
    return result;
  }
}
