import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/base/button/button';
import { Menu } from '@/components/base/floating/menu/menu';
import { SchemaProposalStage } from '@/gql/graphql';

const STAGE_TRANSITIONS: ReadonlyArray<
  Readonly<{
    fromStates: ReadonlyArray<SchemaProposalStage>;
    value: SchemaProposalStage;
    label: string;
  }>
> = [
  {
    fromStates: [SchemaProposalStage.Open, SchemaProposalStage.Approved],
    value: SchemaProposalStage.Draft,
    label: 'REVERT TO DRAFT',
  },
  {
    fromStates: [SchemaProposalStage.Draft],
    value: SchemaProposalStage.Open,
    label: 'READY FOR REVIEW',
  },
  {
    fromStates: [SchemaProposalStage.Closed],
    value: SchemaProposalStage.Draft,
    label: 'REOPEN AS DRAFT',
  },
  {
    fromStates: [SchemaProposalStage.Closed, SchemaProposalStage.Approved],
    value: SchemaProposalStage.Open,
    label: 'REOPEN',
  },
  {
    fromStates: [SchemaProposalStage.Open],
    value: SchemaProposalStage.Approved,
    label: 'APPROVE FOR IMPLEMENTING',
  },
  {
    fromStates: [SchemaProposalStage.Draft, SchemaProposalStage.Open, SchemaProposalStage.Approved],
    value: SchemaProposalStage.Closed,
    label: 'CANCEL PROPOSAL',
  },
];

const STAGE_TITLES = {
  [SchemaProposalStage.Open]: 'READY FOR REVIEW',
  [SchemaProposalStage.Approved]: 'AWAITING IMPLEMENTATION',
  [SchemaProposalStage.Closed]: 'CANCELED',
  [SchemaProposalStage.Draft]: 'IN DRAFT',
  [SchemaProposalStage.Implemented]: 'IMPLEMENTED',
} as const;

/**
 * The trigger reads the current stage; the rows are the transitions legal from it. They are
 * actions, not a held value, so this is a Menu rather than a Select.
 */
export function StageTransitionSelect(props: {
  stage: SchemaProposalStage;
  onSelect: (stage: SchemaProposalStage) => void | Promise<void>;
  width?: 'auto' | 'full';
}) {
  return (
    <Menu
      trigger={
        <Button
          variant="outline"
          label={STAGE_TITLES[props.stage]}
          rightIcon={{ icon: ChevronsUpDown, withSeparator: false }}
          width={props.width}
        />
      }
      align="end"
      minWidth="default"
      sections={[
        STAGE_TRANSITIONS.filter(s => s.fromStates.includes(props.stage)).map(s => ({
          label: s.label,
          // @todo debounce...
          onClick: () => void props.onSelect(s.value),
        })),
      ]}
    />
  );
}
