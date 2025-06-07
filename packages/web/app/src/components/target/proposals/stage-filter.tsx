import { SchemaProposalStage } from "@/gql/graphql";
import { useRouter, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronsUpDown } from 'lucide-react';
import { Checkbox } from "@/components/v2";
import { Button } from "@/components/ui/button";

export const StageFilter = ({ selectedStages }: {
  selectedStages: string[];
}) => {
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
      <PopoverContent align="end" className="truncate p-0 w-[180px]">
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
                  <div className="flex-row flex items-center">
                    <Checkbox className="mr-[6px]" checked={selectedStages.includes(stage)}/><div className="flex-col flex-grow text-ellipsis whitespace-nowrap overflow-hidden max-w-[350px]">{stage}</div>
                  </div>
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
