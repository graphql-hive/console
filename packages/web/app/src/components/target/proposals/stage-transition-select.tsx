import { useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SchemaProposalStage } from '@/gql/graphql';
import { cn } from '@/lib/utils';

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

export function StageTransitionSelect(props: {
  stage: SchemaProposalStage;
  onSelect: (stage: SchemaProposalStage) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="link"
          role="combobox"
          className="flex min-w-[200px] max-w-[250px] justify-between truncate"
          aria-expanded={open}
        >
          <span className="truncate">{STAGE_TITLES[props.stage]}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="truncate p-0">
        <Command>
          <CommandGroup>
            <ScrollArea className="relative max-h-screen">
              {STAGE_TRANSITIONS.filter(s => s.fromStates.includes(props.stage))?.map(s => (
                <CommandItem
                  key={s.value}
                  value={s.value}
                  onSelect={async value => {
                    // @todo debounce...
                    await props.onSelect(value.toUpperCase() as SchemaProposalStage);
                    setOpen(false);
                  }}
                  className="cursor-pointer truncate"
                >
                  <div
                    className={cn(
                      'flex flex-row truncate p-1 text-gray-400 hover:text-white',
                      s.value === props.stage && 'underline',
                    )}
                  >
                    {s.label}
                  </div>
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
