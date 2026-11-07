import { UsersIcon } from 'lucide-react';
import { DataTableCell } from '@/components/ui/data-table/data-table-cell';
import { Badge } from '@/components/ui/primitives/badge/badge';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as shared from '@/styles/shared.css';
import { memberGroupsStyles } from './member-groups.css';

export const MemberGroups_GroupFragment = graphql(`
  fragment MemberGroups_GroupFragment on Group {
    id
    name
  }
`);

export function MemberGroups(props: {
  groups: Array<FragmentType<typeof MemberGroups_GroupFragment>>;
  /**
   * `row` keeps the list to one line for a table cell: two pills, the rest behind a +N pill,
   * long names cut. `all` lays every group out in full, for a dialog where the reader is
   * checking exactly which groups a member has.
   */
  layout?: 'row' | 'all';
}) {
  const groups = useFragment(MemberGroups_GroupFragment, props.groups);
  const layout = props.layout ?? 'row';

  if (groups.length === 0) {
    return (
      <Tooltip
        trigger={
          <div className={memberGroupsStyles.none}>
            <UsersIcon className={memberGroupsStyles.icon} />
            <span className={shared.text.xs}>Groups: none</span>
          </div>
        }
        content="Groups can be assigned via the SCIM provider."
      />
    );
  }

  return (
    <div className={layout === 'all' ? shared.row.wrap2 : memberGroupsStyles.row}>
      <div className={shared.row.gap1_5}>
        <UsersIcon className={memberGroupsStyles.icon} />
        <span className={shared.text.xs}>Groups:</span>
      </div>

      {layout === 'all' ? (
        groups.map(group => <Badge key={group.id} content={group.name} />)
      ) : (
        <DataTableCell
          kind="badge"
          items={groups.map(group => ({ content: group.name }))}
          max={2}
          maxLength={16}
        />
      )}
    </div>
  );
}
