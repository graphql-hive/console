import { useMemo, useState } from 'react';
import {
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from 'lucide-react';
import { GraphQLIcon } from '@/laboratory/components/icons';
import { useLaboratory } from '@/laboratory/components/laboratory/context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/laboratory/components/ui/alert-dialog';
import { Button } from '@/laboratory/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/laboratory/components/ui/collapsible';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/laboratory/components/ui/empty';
import { Input } from '@/laboratory/components/ui/input';
import { ScrollArea, ScrollBar } from '@/laboratory/components/ui/scroll-area';
import { Tooltip, TooltipContent } from '@/laboratory/components/ui/tooltip';
import type {
  LaboratoryCollection,
  LaboratoryCollectionOperation,
} from '@/laboratory/lib/collections';
import { cn } from '@/laboratory/lib/utils';
import { TooltipTrigger } from '@radix-ui/react-tooltip';

export const CollectionItem = (props: { collection: LaboratoryCollection }) => {
  const {
    activeOperation,
    operations,
    addOperation,
    setActiveOperation,
    deleteCollection,
    deleteOperationFromCollection,
    addTab,
    setActiveTab,
    checkPermissions,
  } = useLaboratory();

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="bg-neutral-3 group sticky top-0 w-full justify-start px-2"
          size="sm"
        >
          {isOpen ? (
            <FolderOpenIcon className="text-neutral-10 size-4" />
          ) : (
            <FolderIcon className="text-neutral-10 size-4" />
          )}
          {props.collection.name}
          {checkPermissions?.('collections:delete') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="link"
                      className="text-neutral-10 p-1! pr-0! ml-auto opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      onClick={e => {
                        e.stopPropagation();
                      }}
                    >
                      <TrashIcon />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you sure you want to delete collection?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {props.collection.name} will be permanently deleted. All operations in this
                        collection will be deleted as well.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button
                          variant="destructive"
                          onClick={e => {
                            e.stopPropagation();
                            deleteCollection(props.collection.id);
                          }}
                        >
                          Delete
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TooltipTrigger>
              <TooltipContent>Delete collection</TooltipContent>
            </Tooltip>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className={cn('border-neutral-5 ml-4 flex flex-col gap-1 border-l pl-2')}>
        {isOpen &&
          props.collection.operations.map(operation => {
            const isActive = activeOperation?.id === operation.id;

            return (
              <Button
                key={operation.name}
                variant="ghost"
                className={cn('group w-full justify-start gap-2 px-2', {
                  'bg-neutral-2': isActive,
                })}
                size="sm"
                onClick={() => {
                  if (operations.some(o => o.id === operation.id)) {
                    setActiveOperation(operation.id);
                  } else {
                    const newOperation = addOperation(operation);
                    const tab = addTab({
                      type: 'operation',
                      data: newOperation,
                    });

                    setActiveTab(tab);
                  }
                }}
              >
                <GraphQLIcon className="size-4 text-pink-500" />
                {operation.name}
                {checkPermissions?.('collectionsOperations:delete') && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="link"
                            className="text-neutral-10 p-1! pr-0! ml-auto opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                            onClick={e => {
                              e.stopPropagation();
                            }}
                          >
                            <TrashIcon />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you sure you want to delete operation {operation.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {operation.name} will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction asChild>
                              <Button
                                variant="destructive"
                                onClick={e => {
                                  e.stopPropagation();
                                  deleteOperationFromCollection(props.collection.id, operation.id);
                                }}
                              >
                                Delete
                              </Button>
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TooltipTrigger>
                    <TooltipContent>Delete operation</TooltipContent>
                  </Tooltip>
                )}
              </Button>
            );
          })}
      </CollapsibleContent>
    </Collapsible>
  );
};

export interface CollectionsSearchResultItem extends LaboratoryCollectionOperation {
  parent: LaboratoryCollection;
}

export const CollectionsSearchResult = (props: { items: CollectionsSearchResultItem[] }) => {
  const { activeOperation, operations, addOperation, setActiveOperation, addTab, setActiveTab } =
    useLaboratory();

  return (
    <div className="flex flex-col gap-1">
      {props.items.map(operation => {
        const isActive = activeOperation?.id === operation.id;

        return (
          <Button
            key={operation.name}
            variant="ghost"
            className={cn('group w-full justify-start gap-2 px-2', {
              'bg-neutral-2': isActive,
            })}
            size="sm"
            onClick={() => {
              if (operations.some(o => o.id === operation.id)) {
                setActiveOperation(operation.id);
              } else {
                const newOperation = addOperation(operation);
                const tab = addTab({
                  type: 'operation',
                  data: newOperation,
                });

                setActiveTab(tab);
              }
            }}
          >
            <GraphQLIcon className="size-4 text-pink-500" />
            <span className="text-neutral-10 truncate">{operation.parent.name}</span>
            <span className="text-neutral-10">{' / '}</span>
            {operation.name}
          </Button>
        );
      })}
    </div>
  );
};

export const Collections = () => {
  const [search, setSearch] = useState('');
  const { collections, openAddCollectionDialog, checkPermissions } = useLaboratory();

  const searchResults = useMemo(() => {
    return collections
      .reduce((acc, collection) => {
        return [
          ...acc,
          ...collection.operations.map(operation => ({
            ...operation,
            parent: collection,
          })),
        ];
      }, [] as CollectionsSearchResultItem[])
      .filter(item => {
        return item.name.toLowerCase().includes(search.toLowerCase());
      });
  }, [collections, search]);

  return (
    <div className="grid size-full grid-rows-[auto_1fr] pb-0">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 p-3 pb-0">
          <span className="text-base font-medium">Collections</span>
          <div className="ml-auto flex items-center gap-2">
            {checkPermissions?.('collections:create') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="p-1! size-6 rounded-sm"
                    onClick={openAddCollectionDialog}
                  >
                    <FolderPlusIcon className="text-neutral-11 size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add collection</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        <div className="border-neutral-5 relative border-b p-3">
          <SearchIcon className="text-neutral-10 absolute left-5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search..."
            className={cn('px-7')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="p-1! absolute right-5 top-1/2 size-6 -translate-y-1/2 rounded-sm"
              onClick={() => setSearch('')}
            >
              <XIcon className="text-neutral-10 size-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="size-full overflow-hidden">
        <ScrollArea className="size-full">
          <div className="flex flex-col gap-1 p-3">
            {search.length > 0 ? (
              searchResults.length > 0 ? (
                <CollectionsSearchResult items={searchResults} />
              ) : (
                <Empty className="px-0! w-full">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SearchIcon className="text-neutral-10 size-6" />
                    </EmptyMedia>
                    <EmptyTitle className="text-base">No results found</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      No collections found matching your search.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )
            ) : collections.length > 0 ? (
              collections.map(item => <CollectionItem key={item.id} collection={item} />)
            ) : (
              <Empty className="px-0! w-full">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderIcon className="text-neutral-10 size-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-base">No collections yet</EmptyTitle>
                  <EmptyDescription className="text-xs">
                    You haven't created any collections yet. Get started by adding your first
                    collection.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="secondary" size="sm" onClick={openAddCollectionDialog}>
                    Add collection
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </div>
          <ScrollBar />
        </ScrollArea>
      </div>
    </div>
  );
};
