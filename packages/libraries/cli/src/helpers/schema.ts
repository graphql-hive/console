import colors from 'colors';
import { concatAST, parse, print, stripIgnoredCharacters } from 'graphql';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { JsonFileLoader } from '@graphql-tools/json-file-loader';
import { loadTypedefs } from '@graphql-tools/load';
import { UrlLoader } from '@graphql-tools/url-loader';
import type { Loader } from '@graphql-tools/utils';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { FragmentType, graphql, useFragment as unmaskFragment, useFragment } from '../gql';
import { SchemaWarningConnection, SeverityLevelType } from '../gql/graphql';
import { graphqlRequest } from './graphql-request';
import { Texture } from './texture/texture';

const indent = '  ';

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
   * This is used to determine the correct loader to use.
   *
   * If a user is simply introspecting a schema, the 'introspection' should be used.
   * In case of federation, we should skip the UrlLoader,
   * because it will try to introspect the schema
   * instead of fetching the SDL with directives.
   */
  intent: 'introspection' | 'federation-subgraph-introspection',
  file: string,
  options?: {
    headers?: Record<string, string>;
    method?: 'GET' | 'POST';
  },
) {
  const loaders: Loader[] = [new CodeFileLoader(), new GraphQLFileLoader(), new JsonFileLoader()];

  if (intent === 'federation-subgraph-introspection') {
    loaders.push(new FederationSubgraphUrlLoader());
  } else {
    loaders.push(new UrlLoader());
  }

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
  async load(pointer: string) {
    if (!pointer.startsWith('http://') && !pointer.startsWith('https://')) {
      return null;
    }

    const response = await graphqlRequest({
      endpoint: pointer,
      logger: console,
    }).request({
      operation: parse(`
        query GetFederationSchema {
          _service {
            sdl
          }
        }
      `) as TypedDocumentNode<{ _service: { sdl: string } }, {}>,
      variables: undefined,
    });

    const sdl = minifySchema(response._service.sdl);

    return [
      {
        document: parse(sdl),
        rawSDL: sdl,
      },
    ];
  }
}
