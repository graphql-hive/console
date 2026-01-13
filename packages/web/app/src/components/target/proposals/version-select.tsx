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

export const ProposalQuery_VersionsListFragment = graphql(/* GraphQL */ `
  fragment ProposalQuery_VersionsListFragment on SchemaCheckConnection {
    edges {
      cursor
      node {
        id
        createdAt
        meta {
          author
          commit
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
  const selectedVersionCursor = (search as any).version as string | undefined;

  // @todo handle pagination
  const versions = useFragment(ProposalQuery_VersionsListFragment, props.versions) ?? null;

  const selectedIndex =
    versions.edges.findIndex(({ cursor }) => cursor === selectedVersionCursor) + 1;
  const selectedVersion = versions.edges[selectedIndex];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="link"
          role="combobox"
          className="flex min-w-[50px] max-w-[420px] justify-between"
          aria-expanded={open}
        >
          <span className="truncate">
            {selectedVersion
              ? selectedVersion.node.meta?.commit || selectedVersion.node.id
              : 'Invalid version'}
          </span>
          <ChevronsUpDown className="ml-2 flex size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="min-w-fit max-w-[100vw] truncate p-0">
        <Command>
          <CommandGroup>
            <ScrollArea
              className={cn(
                'relative max-h-[calc(100vh-300px)] overflow-y-auto',
                versions.edges.length > 2 && 'min-h-24',
              )}
            >
              {versions.edges.map(({ node: version }, index) => {
                // must reference the last cursor because of how pagination works...
                // it gets everything _after_ the cursor.
                const lastVersionCursor = versions.edges[index - 1]?.cursor;
                return (
                  <CommandItem
                    key={version.id}
                    value={lastVersionCursor}
                    // selected version is being forced to lowercase
                    onSelect={_selectedVersion => {
                      // @todo make more generic by taking in version via arg
                      void router.navigate({
                        search: { ...search, version: lastVersionCursor },
                      });
                      setOpen(false);
                    }}
                    className="cursor-pointer truncate"
                  >
                    <div
                      className={cn(
                        'flex flex-row gap-x-6 p-1 text-gray-400 hover:text-white',
                        lastVersionCursor === selectedVersionCursor && 'underline',
                      )}
                    >
                      <div className="max-w-[300px] grow flex-col truncate">
                        {version.meta?.commit || version.id}
                      </div>
                      <div className="grow flex-col">
                        (<TimeAgo date={version.createdAt} />)
                      </div>
                      <div className="max-w-[200px] grow flex-col truncate">
                        by {version.meta?.author ?? 'undefined'}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
