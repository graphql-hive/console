import { useRouter, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronsUpDown } from 'lucide-react';
import { Checkbox } from "@/components/v2";
import { Button } from "@/components/ui/button";
import { useQuery } from "urql";
import { graphql } from '@/gql';

const UsersSearchQuery = graphql(`
  query UsersSearch($organizationSlug: String!, $after: String, $first: Int) {
    organization(reference: { bySelector: { organizationSlug: $organizationSlug }}) {
      viewerCanSeeMembers
      members(first: $first, after: $after) {
        edges {
          node {
            user {
              id
              displayName
              fullName
            }
          }
        }
        pageInfo {
          hasNextPage
          startCursor
        }
      }
    }
  }`);

export const UserFilter = ({ selectedUsers, organizationSlug }: {
  selectedUsers: string[];
  organizationSlug: string;
}) => {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState([{after: null, first: 200}])
  const hasSelection = selectedUsers.length !== 0;
  const router = useRouter();
  const [query] = useQuery({
    query: UsersSearchQuery,
    variables: {
      after: pages[pages.length-1]?.after,
      first: pages[pages.length-1]?.first,
      organizationSlug,
    }
  });
  const search = useSearch({ strict: false });
  const users = query.data?.organization?.members.edges.map(e => e.node.user) ?? [];
  // @todo handle preloading selected users to populate on refresh.... And only search on open.
  const selectedUserNames = useMemo(() => {
    return selectedUsers.map(selectedUserId => {
      const match = users.find(user => user.id === selectedUserId);
      return match?.displayName ?? match?.fullName ?? 'Unknown';
    });
  }, [users]);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          className="flex justify-between"
          aria-expanded={open}
        >
          {hasSelection ? selectedUserNames.join(', ') : 'Proposed by'}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0">
        <Command>
          <CommandInput
            placeholder="Search org members..."
          />
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="relative max-h-screen">
              {users?.map(user => (
                <CommandItem
                  key={user.id}
                  // @todo upgrade cmdk and use "keywords" attribute
                  value={`${user.id} ${user.displayName ?? user.fullName}`}
                  onSelect={selectedUser => {
                    const selectedUserId = selectedUser.split(' ')[0];
                    let updated: string[] | undefined = [...selectedUsers];
                    const selectionIdx = updated.findIndex(u => u === selectedUserId);
                    if (selectionIdx >= 0) {
                      updated.splice(selectionIdx, 1);
                      if (updated.length === 0) {
                        updated = undefined;
                      }
                    } else {
                      updated.push(selectedUserId);
                    }
                    void router.navigate({
                      search: { ...search, user: updated },
                    });
                  }}
                  className="cursor-pointer truncate"
                >
                  <div className="flex flex-row items-center w-[270px] truncate min-w-0">
                    <Checkbox className="mr-[6px]" checked={selectedUsers.includes(user.id)}/>
                    <span className="truncate">{user.displayName ?? user.fullName}</span>
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
