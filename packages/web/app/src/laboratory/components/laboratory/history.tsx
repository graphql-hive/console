import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ClockIcon, FolderClockIcon, FolderOpenIcon, HistoryIcon, TrashIcon } from 'lucide-react';
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/laboratory/components/ui/empty';
import { ScrollArea, ScrollBar } from '@/laboratory/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/laboratory/components/ui/tooltip';
import type { LaboratoryHistory, LaboratoryHistoryRequest } from '@/laboratory/lib/history';
import { cn } from '@/laboratory/lib/utils';

export const HistoryOperationItem = (props: { historyItem: LaboratoryHistoryRequest }) => {
  const { activeTab, addTab, setActiveTab, deleteHistory } = useLaboratory();

  const isActive = useMemo(() => {
    return activeTab?.type === 'history' && activeTab.data.id === props.historyItem.id;
  }, [activeTab, props.historyItem]);

  const isError = useMemo(() => {
    if (!props.historyItem.status) {
      return true;
    }

    return (
      props.historyItem.status < 200 ||
      props.historyItem.status >= 300 ||
      ('response' in props.historyItem && JSON.parse(props.historyItem.response).errors)
    );
  }, [props.historyItem]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('bg-background group sticky top-0 w-full justify-start px-2', {
        'bg-accent dark:bg-accent/50': isActive,
      })}
      onClick={() => {
        setActiveTab(
          addTab({
            type: 'history',
            data: props.historyItem,
            readOnly: true,
          }),
        );
      }}
    >
      <HistoryIcon
        className={cn('size-4 text-indigo-400', {
          'text-green-500':
            !props.historyItem.status ||
            (props.historyItem.status >= 200 && props.historyItem.status < 300),
          'text-red-500': isError,
        })}
      />
      <span className="text-muted-foreground">
        {format(new Date(props.historyItem.createdAt), 'HH:mm')}
      </span>
      <div className="truncate">{props.historyItem.operation.name || 'Untitled'}</div>
      <div className="ml-auto flex items-center gap-2">
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
                  <AlertDialogTitle>Are you sure you want to delete history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This history operation will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      variant="destructive"
                      onClick={e => {
                        e.stopPropagation();
                        deleteHistory(props.historyItem.id);
                      }}
                    >
                      Delete
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TooltipTrigger>
          <TooltipContent>Delete history</TooltipContent>
        </Tooltip>
      </div>
    </Button>
  );
};

export const HistoryGroup = (props: { group: { date: string; items: LaboratoryHistory[] } }) => {
  const { deleteHistoryByDay } = useLaboratory();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="bg-background group sticky top-0 w-full justify-start px-2"
          size="sm"
        >
          {isOpen ? (
            <FolderOpenIcon className="text-muted-foreground size-4" />
          ) : (
            <FolderClockIcon className="text-muted-foreground size-4" />
          )}
          {props.group.date}
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
                    <AlertDialogTitle>Are you sure you want to delete history?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All history for {props.group.date} will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        variant="destructive"
                        onClick={e => {
                          e.stopPropagation();
                          deleteHistoryByDay(props.group.date);
                        }}
                      >
                        Delete
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TooltipTrigger>
            <TooltipContent>Delete history</TooltipContent>
          </Tooltip>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className={cn('border-border ml-4 flex flex-col gap-1 border-l pl-2')}>
        {props.group.items.map(h => {
          return <HistoryOperationItem key={h.id} historyItem={h as LaboratoryHistoryRequest} />;
        })}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const History = () => {
  const { history, deleteAllHistory, tabs, setTabs, setActiveTab } = useLaboratory();

  const historyItems = useMemo(() => {
    return history.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [history]);

  const goupedByDate = useMemo(() => {
    return historyItems.reduce(
      (acc, h) => {
        const date = format(new Date(h.createdAt), 'dd MMM yyyy');
        let item = acc.find(i => i.date === date);

        if (!item) {
          item = { date, items: [] };

          acc.push(item);
        }

        item.items.push(h);

        return acc;
      },
      [] as { date: string; items: LaboratoryHistory[] }[],
    );
  }, [historyItems]);

  const handleDeleteAllHistory = useCallback(() => {
    deleteAllHistory();
    setTabs(tabs.filter(t => t.type !== 'history'));

    const newTab = tabs.find(t => t.type !== 'history');

    if (newTab) {
      setActiveTab(newTab);
    }
  }, [deleteAllHistory, setTabs, tabs, setActiveTab]);

  return (
    <div className="grid size-full grid-rows-[auto_1fr] pb-0">
      <div className="border-border flex h-12 items-center gap-2 border-b p-3">
        <span className="text-base font-medium">History</span>
        <div className="ml-auto flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive p-1! size-6 rounded-sm"
                    disabled={history.length === 0}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to delete all history?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      All history will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        variant="destructive"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteAllHistory();
                        }}
                      >
                        Delete
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TooltipTrigger>
            <TooltipContent>Delete all</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="size-full overflow-hidden">
        <ScrollArea className="size-full">
          <div className="flex flex-col gap-1 p-3">
            {goupedByDate.length > 0 ? (
              goupedByDate.map(group => {
                return <HistoryGroup key={group.date} group={group} />;
              })
            ) : (
              <Empty className="px-0! w-full">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClockIcon className="text-muted-foreground size-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-base">No history yet</EmptyTitle>
                  <EmptyDescription className="text-xs">
                    You haven't run any operations yet. Get started by running your first operation.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
          <ScrollBar />
        </ScrollArea>
      </div>
    </div>
  );
};
