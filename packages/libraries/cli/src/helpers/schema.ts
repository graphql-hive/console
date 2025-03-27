import { concatAST, print } from 'graphql';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { JsonFileLoader } from '@graphql-tools/json-file-loader';
import { loadTypedefs } from '@graphql-tools/load';
import { UrlLoader } from '@graphql-tools/url-loader';
import { FragmentType, graphql, useFragment as unmaskFragment, useFragment } from '../gql';
import { CriticalityLevel, SchemaWarningConnection } from '../gql/graphql';
import { Texture } from './texture/texture';

const criticalityMap: Record<CriticalityLevel, string> = {
  [CriticalityLevel.Breaking]: Texture.colors.red('-'),
  [CriticalityLevel.Safe]: Texture.colors.green('-'),
  [CriticalityLevel.Dangerous]: Texture.colors.green('-'),
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
        criticality
        isSafeBasedOnUsage
        message(withSafeBasedOnUsageNote: false)
        approval {
          approvedBy {
            displayName
          }
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
        criticalityMap[change.isSafeBasedOnUsage ? CriticalityLevel.Safe : change.criticality],
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

      t.indent(messageParts.join(' '));
    });
  };

  t.info(`Detected ${changes.edges.length} change${changes.edges.length > 1 ? 's' : ''}`);
  t.line();

  const breakingChanges = changes.edges.filter(
    edge => edge.node.criticality === CriticalityLevel.Breaking,
  );
  const dangerousChanges = changes.edges.filter(
    edge => edge.node.criticality === CriticalityLevel.Dangerous,
  );
  const safeChanges = changes.edges.filter(edge => edge.node.criticality === CriticalityLevel.Safe);

  const otherChanges = changes.edges.filter(
    edge => !Object.keys(CriticalityLevel).includes(edge.node.criticality),
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

  // For backwards compatibility in case more criticality levels are added.
  // This is unlikely to happen.
  if (otherChanges.length) {
    t.indent(`Other changes: (Current CLI version does not support these CriticalityLevels)`);
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
  file: string,
  options?: {
    headers?: Record<string, string>;
    method?: 'GET' | 'POST';
  },
) {
  const sources = await loadTypedefs(file, {
    ...options,
    cwd: process.cwd(),
    loaders: [new CodeFileLoader(), new GraphQLFileLoader(), new JsonFileLoader(), new UrlLoader()],
  });

  return print(concatAST(sources.map(s => s.document!)));
}

export function minifySchema(schema: string): string {
  return schema.replace(/\s+/g, ' ').trim();
}
