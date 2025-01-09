import { FragmentType, graphql, useFragment } from '../../../gql';
import { Texture } from '../../texture/texture';
import { Schema } from '../schema';

const fragment = graphql(`
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

type Mask = FragmentType<typeof fragment>;

export namespace SchemaChangeConnection {
  export const print = (schemaChangeConnectionMask: Mask) => {
    const t = Texture.createBuilder();

    const changes = useFragment(fragment, schemaChangeConnectionMask);
    type ChangeType = (typeof changes)['nodes'][number];

    const writeChanges = (changes: ChangeType[]) => {
      changes.forEach(change => {
        const messageParts = [
          criticalityMap[
            change.isSafeBasedOnUsage ? Schema.CriticalityLevel.Safe : change.criticality
          ],
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
      change => change.criticality === Schema.CriticalityLevel.Breaking,
    );
    const safeChanges = changes.nodes.filter(
      change => change.criticality !== Schema.CriticalityLevel.Breaking,
    );

    if (breakingChanges.length) {
      t.indent(`Breaking changes:`);
      writeChanges(breakingChanges);
    }

    if (safeChanges.length) {
      t.indent(`Safe changes:`);
      writeChanges(safeChanges);
    }

    return t.state.value;
  };
}

const criticalityMap: Record<Schema.CriticalityLevel, string> = {
  [Schema.CriticalityLevel.Breaking]: Texture.colors.red('-'),
  [Schema.CriticalityLevel.Safe]: Texture.colors.green('-'),
  [Schema.CriticalityLevel.Dangerous]: Texture.colors.green('-'),
};
