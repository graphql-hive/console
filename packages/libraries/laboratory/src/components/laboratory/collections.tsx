import { useEffect, useMemo, useState } from 'react';
import {
  CheckIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  PencilIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { TooltipTrigger } from '@radix-ui/react-tooltip';
import type { LaboratoryCollection, LaboratoryCollectionOperation } from '../../lib/collections';
import { cn } from '../../lib/utils';
import { GraphQLIcon } from '../icons';
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
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../ui/empty';
import { Input } from '../ui/input';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Tooltip, TooltipContent } from '../ui/tooltip';
import { useLaboratory } from './context';

export const CollectionItem = (props: { collection: LaboratoryCollection }) => {
  const {
    activeOperation,
    operations,
    addOperation,
    setActiveOperation,
    deleteCollection,
    updateCollection,
    deleteOperationFromCollection,
    addTab,
    setActiveTab,
    checkPermissions,
  } = useLaboratory();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(props.collection.name);

  const hasActiveOperation = useMemo(() => {
    return props.collection.operations.some(operation => operation.id === activeOperation?.id);
  }, [props.collection.operations, activeOperation]);

  useEffect(() => {
    if (hasActiveOperation) {
      setIsOpen(true);
    }
  }, [hasActiveOperation]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        {isEditing ? (
          <InputGroup className="!bg-accent/50 h-8 border-none">
            <InputGroupAddon className="pl-2.5">
              {isOpen ? (
                <FolderOpenIcon className="text-muted-foreground size-4" />
              ) : (
                <FolderIcon className="text-muted-foreground size-4" />
              )}
            </InputGroupAddon>
            <InputGroupInput
              autoFocus
              defaultValue={editedName}
              className="!pl-1.5 font-medium"
              onChange={e => setEditedName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  updateCollection(props.collection.id, {
                    name: editedName,
                  });
                  setIsEditing(false);
                }
                if (e.key === 'Escape') {
                  setEditedName(props.collection.name);
                  setIsEditing(false);
                }
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                className="p-1!"
                onClick={e => {
                  e.stopPropagation();

                  updateCollection(props.collection.id, {
                    name: editedName,
                  });

                  setIsEditing(false);
                }}
              >
                <CheckIcon />
              </InputGroupButton>
              <InputGroupButton
                className="p-1!"
                onClick={e => {
                  e.stopPropagation();

                  setIsEditing(false);
                  setEditedName(props.collection.name);
                }}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        ) : (
          <Button
            variant="ghost"
            className="bg-background !hover:bg-accent/50 group sticky top-0 w-full justify-start px-2"
            size="sm"
          >
            {isOpen ? (
              <FolderOpenIcon className="text-muted-foreground size-4" />
            ) : (
              <FolderIcon className="text-muted-foreground size-4" />
            )}
            {props.collection.name}
            <div className="ml-auto flex items-center gap-2">
              {checkPermissions?.('collections:update') && (
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="link"
                      className="text-muted-foreground p-1! pr-0! opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={e => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                    >
                      <PencilIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit collection</TooltipContent>
                </Tooltip>
              )}
              {checkPermissions?.('collections:delete') && (
                <Tooltip>
                  <TooltipTrigger>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="link"
                          className="text-muted-foreground hover:text-destructive p-1! pr-0! opacity-0 transition-opacity group-hover:opacity-100"
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
                            {props.collection.name} will be permanently deleted. All operations in
                            this collection will be deleted as well.
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
            </div>
          </Button>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className={cn('border-border ml-4 flex flex-col gap-1 border-l pl-2')}>
        {isOpen &&
          props.collection.operations.map(operation => {
            const isActive = activeOperation?.id === operation.id;

            return (
              <Button
                key={operation.name}
                variant="ghost"
                className={cn('group w-full justify-start gap-2 px-2', {
                  'bg-accent/50': isActive,
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
                            className="text-muted-foreground hover:text-destructive p-1! pr-0! ml-auto opacity-0 transition-opacity group-hover:opacity-100"
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
              'bg-accent/50': isActive,
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
            <span className="text-muted-foreground truncate">{operation.parent.name}</span>
            <span className="text-muted-foreground">{' / '}</span>
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
                    <FolderPlusIcon className="text-primary size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add collection</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        <div className="border-border relative border-b p-3">
          <SearchIcon className="text-muted-foreground absolute left-5 top-1/2 size-4 -translate-y-1/2" />
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
              <XIcon className="text-muted-foreground size-4" />
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
                      <SearchIcon className="text-muted-foreground size-6" />
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
                    <FolderIcon className="text-muted-foreground size-6" />
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
