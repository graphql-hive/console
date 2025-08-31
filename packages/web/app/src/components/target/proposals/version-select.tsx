import { useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimeAgo } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { useRouter, useSearch } from '@tanstack/react-router';

const ProposalQuery_VersionsListFragment = graphql(/* GraphQL */ `
  fragment ProposalQuery_VersionsListFragment on SchemaCheckConnection {
    edges {
      node {
        id
        createdAt
        meta {
          author
        }
      }
    }
  }
`);

export function VersionSelect(props: {
  proposalId: string;
  versions: FragmentType<typeof ProposalQuery_VersionsListFragment>;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const search = useSearch({ strict: false });
  // @todo typing
  const selectedVersionId = (search as any).version as string;

  // @todo handle pagination
  const versions =
    useFragment(ProposalQuery_VersionsListFragment, props.versions)?.edges?.map(e => e.node) ??
    null;
  const selectedVersion = selectedVersionId
    ? versions?.find(node => node.id === selectedVersionId)
    : versions?.[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="link"
          role="combobox"
          className="flex min-w-[200px] justify-between"
          aria-expanded={open}
        >
          {selectedVersion ? `Version ${selectedVersion.id}` : 'Invalid version'}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="truncate p-0">
        <Command>
          <CommandGroup>
            <ScrollArea className="relative max-h-screen">
              {versions?.map(version => (
                <CommandItem
                  key={version.id}
                  value={version.id}
                  onSelect={selectedVersion => {
                    void router.navigate({
                      search: { ...search, version: selectedVersion },
                    });
                  }}
                  className="cursor-pointer truncate"
                >
                  <div
                    className={cn(
                      'flex flex-row gap-x-6 p-1 text-gray-400 hover:text-white',
                      version.id === selectedVersionId && 'underline',
                    )}
                  >
                    <div className="max-w-[300px] grow flex-col truncate">Version {version.id}</div>
                    <div className="grow flex-col">
                      (<TimeAgo date={version.createdAt} />)
                    </div>
                    <div className="max-w-[200px] grow flex-col truncate">
                      by {version.user?.displayName ?? version.user?.fullName ?? 'null'}
                    </div>
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
