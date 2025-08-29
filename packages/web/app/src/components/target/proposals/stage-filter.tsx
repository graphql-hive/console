import { useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/v2';
import { SchemaProposalStage } from '@/gql/graphql';
import { useRouter, useSearch } from '@tanstack/react-router';

export const StageFilter = ({ selectedStages }: { selectedStages: string[] }) => {
  const [open, setOpen] = useState(false);
  const hasSelection = selectedStages.length !== 0;
  const router = useRouter();
  const search = useSearch({ strict: false });
  const stages = Object.values(SchemaProposalStage).map(s => s.toLocaleLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          className="flex justify-between"
          aria-expanded={open}
        >
          {hasSelection ? selectedStages.join(', ') : 'Stage'}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[180px] truncate p-0">
        <Command>
          <CommandGroup>
            <ScrollArea className="relative max-h-screen">
              {stages?.map(stage => (
                <CommandItem
                  key={stage}
                  value={stage}
                  onSelect={selectedStage => {
                    let updated: string[] | undefined = [...selectedStages];
                    const selectionIdx = updated.findIndex(s => s === selectedStage);
                    if (selectionIdx >= 0) {
                      updated.splice(selectionIdx, 1);
                      if (updated.length === 0) {
                        updated = undefined;
                      }
                    } else {
                      updated.push(selectedStage);
                    }
                    void router.navigate({
                      search: { ...search, stage: updated },
                    });
                  }}
                  className="cursor-pointer truncate"
                >
                  <div className="flex flex-row items-center">
                    <Checkbox className="mr-[6px]" checked={selectedStages.includes(stage)} />
                    <div className="max-w-[350px] grow flex-col truncate">{stage}</div>
                  </div>
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
