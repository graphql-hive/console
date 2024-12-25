import { FragmentType, graphql, useFragment } from '../gql';
import * as SchemaOutput from '../output/data';

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
