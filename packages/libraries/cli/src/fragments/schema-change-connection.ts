import colors from 'colors';
import type { ResultOf } from '@graphql-typed-document-node/core';
import BaseCommand from '../base-command';
import { FragmentType, graphql, useFragment } from '../gql';
import { CriticalityLevel } from '../gql/graphql';
import { indent } from '../helpers/text';
import * as SchemaOutput from '../schema-output/data';

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

type SchemaChangeConnection = ResultOf<typeof fragment>;

type SchemaChange = SchemaChangeConnection['nodes'][number];

export namespace SchemaChangeConnection {
  export function log(this: BaseCommand<any>, mask: Mask) {
    const schemaChanges = useFragment(fragment, mask);

    const writeChanges = (schemaChanges: SchemaChange[]) => {
      schemaChanges.forEach(change => {
        const messageParts = [
          String(indent),
          criticalityMap[change.isSafeBasedOnUsage ? CriticalityLevel.Safe : change.criticality],
          this.bolderize(change.message),
        ];

        if (change.isSafeBasedOnUsage) {
          messageParts.push(colors.green('(Safe based on usage ✓)'));
        }
        if (change.approval) {
          messageParts.push(
            colors.green(
              `(Approved by ${change.approval.approvedBy?.displayName ?? '<unknown>'} ✓)`,
            ),
          );
        }

        this.log(...messageParts);
      });
    };

    this.logInfo(`Detected ${schemaChanges.total} change${schemaChanges.total > 1 ? 's' : ''}`);
    this.log('');

    const breakingChanges = schemaChanges.nodes.filter(
      change => change.criticality === CriticalityLevel.Breaking,
    );
    const safeChanges = schemaChanges.nodes.filter(
      change => change.criticality !== CriticalityLevel.Breaking,
    );

    if (breakingChanges.length) {
      this.log(String(indent), `Breaking changes:`);
      writeChanges(breakingChanges);
    }

    if (safeChanges.length) {
      this.log(String(indent), `Safe changes:`);
      writeChanges(safeChanges);
    }
  }

  export const toSchemaOutput = (mask: undefined | null | Mask): SchemaOutput.SchemaChange[] => {
    const changes = useFragment(fragment, mask);
    return (
      changes?.nodes.map(_ => ({
        message: _.message,
        criticality: _.criticality,
        isSafeBasedOnUsage: _.isSafeBasedOnUsage,
        approval: _.approval
          ? {
              by: _.approval.approvedBy
                ? {
                    displayName: _.approval.approvedBy.displayName,
                  }
                : null,
            }
          : null,
      })) ?? []
    );
  };
}

const criticalityMap: Record<CriticalityLevel, string> = {
  [CriticalityLevel.Breaking]: colors.red('-'),
  [CriticalityLevel.Safe]: colors.green('-'),
  [CriticalityLevel.Dangerous]: colors.green('-'),
};
