import { useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/base/button/button';
import { Menu } from '@/components/base/floating/menu/menu';
import { SchemaProposalStage } from '@/gql/graphql';
import { useRouter, useSearch } from '@tanstack/react-router';

export const StageFilter = ({ selectedStages }: { selectedStages: string[] }) => {
  const [open, setOpen] = useState(false);
  const hasSelection = selectedStages.length !== 0;
  const router = useRouter();
  const search = useSearch({ strict: false });
  const stages = Object.values(SchemaProposalStage).map(s => s.toLocaleLowerCase());
  const allSelected = stages.every(s => selectedStages.includes(s));

  const setStages = (updated: string[] | undefined) =>
    void router.navigate({
      to: '.',
      search: { ...search, stage: updated },
    });

  return (
    <Menu
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          variant="ghost"
          label={hasSelection ? selectedStages.join(', ') : 'Stage'}
          rightIcon={{ icon: ChevronsUpDown, withSeparator: false }}
        />
      }
      align="start"
      minWidth="default"
      sections={[
        [
          {
            kind: 'checkbox',
            label: 'All',
            checked: allSelected,
            onCheckedChange: () => setStages(allSelected ? undefined : [...stages]),
          },
        ],
        stages.map(stage => ({
          kind: 'checkbox' as const,
          label: stage,
          checked: selectedStages.includes(stage),
          onCheckedChange: () => {
            let updated: string[] | undefined = [...selectedStages];
            const selectionIdx = updated.findIndex(s => s === stage);
            if (selectionIdx >= 0) {
              updated.splice(selectionIdx, 1);
              if (updated.length === 0) {
                updated = undefined;
              }
            } else {
              updated.push(stage);
            }
            setStages(updated);
          },
        })),
      ]}
    />
  );
};
