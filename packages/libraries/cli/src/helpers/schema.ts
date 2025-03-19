import { concatAST, print } from 'graphql';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { JsonFileLoader } from '@graphql-tools/json-file-loader';
import { loadTypedefs } from '@graphql-tools/load';
import { UrlLoader } from '@graphql-tools/url-loader';
import { FragmentType, graphql, useFragment as unmaskFragment } from '../gql';
import { CriticalityLevel, SchemaErrorConnection, SchemaWarningConnection } from '../gql/graphql';
import { Texture } from './texture/texture';

const criticalityMap: Record<CriticalityLevel, string> = {
  [CriticalityLevel.Breaking]: Texture.colors.red('-'),
  [CriticalityLevel.Safe]: Texture.colors.green('-'),
  [CriticalityLevel.Dangerous]: Texture.colors.green('-'),
};

export const renderErrors = (errors: SchemaErrorConnection) => {
  const t = Texture.createBuilder();
  t.failure(`Detected ${errors.total} error${errors.total > 1 ? 's' : ''}`);
  t.line();
  errors.nodes.forEach(error => {
    t.indent(Texture.colors.red('-') + ' ' + Texture.boldQuotedWords(error.message));
  });
  return t.state.value;
};

const RenderChanges_SchemaChanges = graphql(`
  fragment RenderChanges_schemaChanges on SchemaChangeConnection {
    total
    nodes {
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
`);

export const renderChanges = (maskedChanges: FragmentType<typeof RenderChanges_SchemaChanges>) => {
  const t = Texture.createBuilder();
  const changes = unmaskFragment(RenderChanges_SchemaChanges, maskedChanges);
  type ChangeType = (typeof changes)['nodes'][number];

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

  t.info(`Detected ${changes.total} change${changes.total > 1 ? 's' : ''}`);
  t.line();

  const breakingChanges = changes.nodes.filter(
    change => change.criticality === CriticalityLevel.Breaking,
  );
  const dangerousChanges = changes.nodes.filter(
    change => change.criticality === CriticalityLevel.Dangerous,
  );
  const safeChanges = changes.nodes.filter(change => change.criticality === CriticalityLevel.Safe);

  const otherChanges = changes.nodes.filter(
    change => !Object.keys(CriticalityLevel).includes(change.criticality),
  );

  if (breakingChanges.length) {
    t.indent(`Breaking changes:`);
    writeChanges(breakingChanges);
  }

  if (dangerousChanges.length) {
    t.indent(`Dangerous changes:`);
    writeChanges(dangerousChanges);
  }

  if (safeChanges.length) {
    t.indent(`Safe changes:`);
    writeChanges(safeChanges);
  }

  // For backwards compatibility in case more criticality levels are added.
  // This is unlikely to happen.
  if (otherChanges.length) {
    t.indent(`Other changes: (Current CLI version does not support these CriticalityLevels)`);
    writeChanges(otherChanges);
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
