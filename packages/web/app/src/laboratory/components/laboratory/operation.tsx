import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookmarkIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  FileTextIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PowerIcon,
  PowerOffIcon,
  SquarePenIcon,
} from 'lucide-react';
import { compressToEncodedURIComponent } from 'lz-string';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { toast } from 'sonner';
import { z } from 'zod';
import { Builder } from '@/laboratory/components/laboratory/builder';
import { useLaboratory } from '@/laboratory/components/laboratory/context';
import { Editor } from '@/laboratory/components/laboratory/editor';
import { Badge } from '@/laboratory/components/ui/badge';
import { Button } from '@/laboratory/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/laboratory/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/laboratory/components/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/laboratory/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/laboratory/components/ui/field';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/laboratory/components/ui/resizable';
import { ScrollArea, ScrollBar } from '@/laboratory/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/laboratory/components/ui/select';
import { Spinner } from '@/laboratory/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/laboratory/components/ui/tabs';
import { Toggle } from '@/laboratory/components/ui/toggle';
import type {
  LaboratoryHistory,
  LaboratoryHistoryRequest,
  LaboratoryHistorySubscription,
} from '@/laboratory/lib/history';
import type { LaboratoryOperation } from '@/laboratory/lib/operations';
import { cn } from '@/laboratory/lib/utils';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { useForm } from '@tanstack/react-form';

const variablesUri = monaco.Uri.file('variables.json');

const Variables = (props: { operation?: LaboratoryOperation | null; isReadOnly?: boolean }) => {
  const { activeOperation, updateActiveOperation } = useLaboratory();

  const operation = useMemo(() => {
    return props.operation ?? activeOperation ?? null;
  }, [props.operation, activeOperation]);

  return (
    <Editor
      uri={variablesUri}
      value={operation?.variables ?? ''}
      language="json"
      onChange={value => {
        updateActiveOperation({
          variables: value ?? '',
        });
      }}
      options={{
        readOnly: props.isReadOnly,
      }}
    />
  );
};

const Headers = (props: { operation?: LaboratoryOperation | null; isReadOnly?: boolean }) => {
  const { activeOperation, updateActiveOperation } = useLaboratory();

  const operation = useMemo(() => {
    return props.operation ?? activeOperation ?? null;
  }, [props.operation, activeOperation]);

  return (
    <Editor
      uri={monaco.Uri.file('headers.json')}
      value={operation?.headers ?? ''}
      onChange={value => {
        updateActiveOperation({
          headers: value ?? '',
        });
      }}
      options={{
        readOnly: props.isReadOnly,
      }}
    />
  );
};

const Extensions = (props: { operation?: LaboratoryOperation | null; isReadOnly?: boolean }) => {
  const { activeOperation, updateActiveOperation } = useLaboratory();

  const operation = useMemo(() => {
    return props.operation ?? activeOperation ?? null;
  }, [props.operation, activeOperation]);

  return (
    <Editor
      uri={monaco.Uri.file('extensions.json')}
      value={operation?.extensions ?? ''}
      onChange={value => {
        updateActiveOperation({
          extensions: value ?? '',
        });
      }}
      options={{
        readOnly: props.isReadOnly,
      }}
    />
  );
};

export const ResponseBody = ({ historyItem }: { historyItem?: LaboratoryHistory | null }) => {
  return (
    <Editor
      value={JSON.stringify(
        JSON.parse((historyItem as LaboratoryHistoryRequest)?.response ?? '{}'),
        null,
        2,
      )}
      defaultLanguage="json"
      theme="hive-laboratory"
      options={{
        readOnly: true,
      }}
    />
  );
};

export const ResponseHeaders = ({ historyItem }: { historyItem?: LaboratoryHistory | null }) => {
  return (
    <Editor
      value={JSON.stringify(
        JSON.parse((historyItem as LaboratoryHistoryRequest)?.headers ?? '{}'),
        null,
        2,
      )}
      defaultLanguage="json"
      theme="hive-laboratory"
    />
  );
};

export const ResponsePreflight = ({ historyItem }: { historyItem?: LaboratoryHistory | null }) => {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1.5 whitespace-pre-wrap p-3">
        {historyItem?.preflightLogs?.map((log, i) => (
          <div className="gap-2 font-mono" key={i}>
            <span className="text-muted-foreground text-xs">{log.createdAt}</span>{' '}
            <span
              className={cn('text-xs font-medium', {
                'text-blue-400': log.level === 'info',
                'text-green-400': log.level === 'log',
                'text-yellow-400': log.level === 'warn',
                'text-red-400': log.level === 'error',
                'text-gray-400': log.level === 'system',
              })}
            >
              {log.level.toUpperCase()}
            </span>{' '}
            <span className="text-xs">{log.message.join(' ')}</span>
          </div>
        ))}
      </div>
      <ScrollBar />
    </ScrollArea>
  );
};

export const ResponseSubscription = ({
  historyItem,
}: {
  historyItem?: LaboratoryHistorySubscription | null;
}) => {
  const { isActiveOperationLoading } = useLaboratory();

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex h-12 border-b p-3 text-base font-medium">
        Subscription
        <div className="ml-auto flex items-center gap-2">
          {isActiveOperationLoading ? (
            <Badge variant="default" className="bg-green-400/10 text-green-500">
              Listening
            </Badge>
          ) : (
            <Badge variant="default" className="bg-red-400/10 text-red-500">
              Not listening
            </Badge>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col">
            {historyItem?.responses
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((response, i) => {
                const value = [
                  `// ${response.createdAt}`,
                  '',
                  JSON.stringify(JSON.parse(response.data), null, 2),
                ].join('\n');

                const height = 20.5 * value.split('\n').length;

                return (
                  <div className="border-border border-b" style={{ height: `${height}px` }} key={i}>
                    <Editor
                      key={response.createdAt}
                      value={value}
                      defaultLanguage="json"
                      theme="hive-laboratory"
                      options={{
                        readOnly: true,
                        scrollBeyondLastLine: false,
                        scrollbar: {
                          vertical: 'hidden',
                          handleMouseWheel: false,
                          alwaysConsumeMouseWheel: false,
                        },
                      }}
                    />
                  </div>
                );
              })}
          </div>
          <ScrollBar />
        </ScrollArea>
      </div>
    </div>
  );
};

export const Response = ({ historyItem }: { historyItem?: LaboratoryHistoryRequest | null }) => {
  const isError = useMemo(() => {
    if (!historyItem) {
      return false;
    }

    if (!historyItem.status) {
      return true;
    }

    return (
      historyItem.status < 200 ||
      historyItem.status >= 300 ||
      ('response' in historyItem && JSON.parse(historyItem.response).errors)
    );
  }, [historyItem]);

  return (
    <Tabs defaultValue="response" className="grid size-full grid-rows-[auto_1fr]">
      <TabsList className="h-[49.5px] w-full justify-start rounded-none border-b bg-transparent p-3">
        <TabsTrigger value="response" className="grow-0 rounded-sm">
          Response
        </TabsTrigger>
        <TabsTrigger value="headers" className="grow-0 rounded-sm">
          Headers
        </TabsTrigger>
        {historyItem?.preflightLogs && historyItem?.preflightLogs.length > 0 && (
          <TabsTrigger value="preflight" className="grow-0 rounded-sm">
            Preflight
          </TabsTrigger>
        )}
        {historyItem ? (
          <div className="ml-auto flex items-center gap-2">
            {historyItem?.status && (
              <Badge
                className={cn('bg-green-400/10 text-green-500', {
                  'bg-red-400/10 text-red-500': isError,
                })}
              >
                {!isError ? (
                  <CircleCheckIcon className="size-3" />
                ) : (
                  <CircleXIcon className="size-3" />
                )}
                <span>{(historyItem as LaboratoryHistoryRequest).status}</span>
              </Badge>
            )}
            {historyItem?.duration && (
              <Badge variant="outline" className="bg-card">
                <ClockIcon className="size-3" />
                <span>
                  {Math.round((historyItem as LaboratoryHistoryRequest).duration!)}
                  ms
                </span>
              </Badge>
            )}
            {historyItem?.size && (
              <Badge variant="outline" className="bg-card">
                <FileTextIcon className="size-3" />
                <span>
                  {Math.round((historyItem as LaboratoryHistoryRequest).size! / 1024)}
                  KB
                </span>
              </Badge>
            )}
          </div>
        ) : null}
      </TabsList>
      <TabsContent value="response">
        <ResponseBody historyItem={historyItem} />
      </TabsContent>
      <TabsContent value="headers">
        <ResponseHeaders historyItem={historyItem} />
      </TabsContent>
      <TabsContent value="preflight">
        <ResponsePreflight historyItem={historyItem} />
      </TabsContent>
    </Tabs>
  );
};

const saveToCollectionFormSchema = z.object({
  collectionId: z.string().min(1, 'Collection is required'),
});

export const Query = (props: {
  onAfterOperationRun?: (historyItem: LaboratoryHistory | null) => void;
  operation?: LaboratoryOperation | null;
  isReadOnly?: boolean;
}) => {
  const {
    endpoint,
    runActiveOperation,
    activeOperation,
    isActiveOperationLoading,
    updateActiveOperation,
    collections,
    addOperationToCollection,
    addHistory,
    stopActiveOperation,
    addResponseToHistory,
    isActiveOperationSubscription,
    runPreflight,
    addTab,
    setActiveTab,
    addOperation,
    checkPermissions,
    preflight,
    setPreflight,
    plugins,
    pluginsState,
    setPluginsState,
  } = useLaboratory();

  const operation = useMemo(() => {
    return props.operation ?? activeOperation ?? null;
  }, [props.operation, activeOperation]);

  const handleRunOperation = useCallback(async () => {
    if (!operation || !endpoint) {
      return;
    }

    const result = await runPreflight?.(plugins, pluginsState);

    setPluginsState(result?.pluginsState ?? {});

    if (result?.status === 'error') {
      const newItemHistory = addHistory({
        headers: '{}',
        operation,
        preflightLogs: result?.logs ?? [],
        response: `{
          "errors": [
            {
              "message": "Preflight failed check logs for more details"
            }
          ]
        }`,
        createdAt: new Date().toISOString(),
      } as Omit<LaboratoryHistoryRequest, 'id'>);

      props.onAfterOperationRun?.(newItemHistory);
      return;
    }

    if (isActiveOperationSubscription) {
      const newItemHistory = addHistory({
        responses: [],
        operation,
        preflightLogs: result?.logs ?? [],
        createdAt: new Date().toISOString(),
      } as Omit<LaboratoryHistorySubscription, 'id'>);

      void runActiveOperation(endpoint, {
        env: result?.env,
        headers: result?.headers,
        onResponse: data => {
          addResponseToHistory(newItemHistory.id, data);
        },
      });

      props.onAfterOperationRun?.(newItemHistory);
    } else {
      const startTime = performance.now();

      const response = await runActiveOperation(endpoint, {
        env: result?.env,
        headers: result?.headers,
      });

      if (!response) {
        return;
      }

      const status = response.status;
      const duration = performance.now() - startTime;
      const responseText = await response.text();
      const size = responseText.length;

      const newItemHistory = addHistory({
        status,
        duration,
        size,
        headers: JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2),
        operation,
        preflightLogs: result?.logs ?? [],
        response: responseText,
        createdAt: new Date().toISOString(),
      } as Omit<LaboratoryHistoryRequest, 'id'>);

      props.onAfterOperationRun?.(newItemHistory);
    }
  }, [
    operation,
    endpoint,
    isActiveOperationSubscription,
    addHistory,
    runActiveOperation,
    props,
    addResponseToHistory,
    runPreflight,
    pluginsState,
  ]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();

        void handleRunOperation();
      }
    };

    document.addEventListener('keydown', down, { capture: true });
    return () => document.removeEventListener('keydown', down, { capture: true });
  }, [handleRunOperation]);

  const [isSaveToCollectionDialogOpen, setIsSaveToCollectionDialogOpen] = useState(false);

  const saveToCollectionForm = useForm({
    defaultValues: {
      collectionId: '',
    },
    validators: {
      onSubmit: saveToCollectionFormSchema,
    },
    onSubmit: ({ value }) => {
      if (!operation) {
        return;
      }

      addOperationToCollection(value.collectionId, {
        id: operation.id ?? '',
        name: operation.name ?? '',
        query: operation.query ?? '',
        variables: operation.variables ?? '',
        headers: operation.headers ?? '',
        extensions: operation.extensions ?? '',
        description: '',
      });

      setIsSaveToCollectionDialogOpen(false);
    },
  });

  const openSaveToCollectionDialog = useCallback(() => {
    saveToCollectionForm.reset({
      collectionId: collections[0]?.id ?? '',
    });

    setIsSaveToCollectionDialogOpen(true);
  }, [saveToCollectionForm, collections]);

  const isActiveOperationSavedToCollection = useMemo(() => {
    return collections.some(c => c.operations.some(o => o.id === operation?.id));
  }, [operation?.id, collections]);

  const share = useCallback(
    (options: { variables?: boolean; headers?: boolean; extensions?: boolean }) => {
      const value = compressToEncodedURIComponent(
        JSON.stringify({
          n: operation?.name,
          q: operation?.query,
          v: options.variables ? operation?.variables : undefined,
          h: options.headers ? operation?.headers : undefined,
          e: options.extensions ? operation?.extensions : undefined,
        }),
      );

      void navigator.clipboard.writeText(
        `${window.location.origin}${window.location.pathname}?share=${value}`,
      );

      toast.success('Operation copied to clipboard');
    },
    [operation],
  );

  return (
    <div className="grid size-full grid-rows-[auto_1fr] pb-0">
      <Dialog open={isSaveToCollectionDialogOpen} onOpenChange={setIsSaveToCollectionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add collection</DialogTitle>
            <DialogDescription>
              Add a new collection of operations to your laboratory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <form
              id="save-to-collection"
              onSubmit={e => {
                e.preventDefault();
                void saveToCollectionForm.handleSubmit();
              }}
            >
              <FieldGroup>
                <saveToCollectionForm.Field name="collectionId">
                  {field => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Collection</FieldLabel>
                        <Select
                          name={field.name}
                          value={field.state.value}
                          onValueChange={field.handleChange}
                        >
                          <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                            <SelectValue placeholder="Select collection" />
                          </SelectTrigger>
                          <SelectContent>
                            {collections.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    );
                  }}
                </saveToCollectionForm.Field>
              </FieldGroup>
            </form>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="save-to-collection">
              Save to collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="border-border flex w-full items-center gap-2 border-b p-3">
        <span className="text-base font-medium">Operation</span>
        {checkPermissions?.('collectionsOperations:create') && (
          <Toggle
            aria-label="Save operation"
            size="sm"
            variant="default"
            pressed={isActiveOperationSavedToCollection}
            disabled={isActiveOperationSavedToCollection}
            className="data-[state=on]:*:[svg]:fill-yellow-500 data-[state=on]:*:[svg]:stroke-yellow-500 h-6 data-[state=on]:bg-transparent"
            onClick={openSaveToCollectionDialog}
          >
            <BookmarkIcon className="size-4" />
            {isActiveOperationSavedToCollection ? 'Saved' : 'Save'}
          </Toggle>
        )}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm" className="h-6 rounded-sm">
                Share
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => share({ variables: true })}>
                Share with variables
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => share({ variables: true, extensions: true })}>
                Share with variables and extensions
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => share({ variables: true, headers: true, extensions: true })}
              >
                Share with variables, extensions, headers
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Toggle
            aria-label={preflight?.enabled ? 'Disable preflight' : 'Enable preflight'}
            size="sm"
            variant="default"
            pressed={preflight?.enabled}
            className="bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-6 rounded-sm border shadow-sm data-[state=on]:bg-transparent"
            onClick={() => {
              setPreflight({
                ...(preflight ?? { script: '', enabled: true }),
                enabled: !preflight?.enabled,
              });
            }}
          >
            {preflight?.enabled ? (
              <PowerIcon className="size-4 text-green-500" />
            ) : (
              <PowerOffIcon className="size-4 text-red-500" />
            )}
            Preflight
          </Toggle>
          {!props.isReadOnly ? (
            <Button
              variant="default"
              size="sm"
              className="h-6 rounded-sm"
              onClick={() => {
                if (isActiveOperationLoading) {
                  stopActiveOperation?.();
                } else {
                  void handleRunOperation();
                }
              }}
              disabled={!operation || !endpoint}
            >
              {isActiveOperationLoading ? (
                <>
                  <Spinner className="size-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <PlayIcon className="size-4" />
                  <span>Run</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="h-6 rounded-sm"
              onClick={() => {
                if (!operation) {
                  return;
                }

                setActiveTab(
                  addTab({
                    type: 'operation',
                    data: addOperation(operation),
                  }),
                );
              }}
            >
              <SquarePenIcon className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>
      <div className="size-full">
        <Editor
          uri={monaco.Uri.file('operation.graphql')}
          variablesUri={variablesUri}
          value={operation?.query ?? ''}
          onChange={value => {
            updateActiveOperation({
              query: value ?? '',
            });
          }}
          language="graphql"
          theme="hive-laboratory"
          options={{
            readOnly: props.isReadOnly,
          }}
        />
      </div>
    </div>
  );
};

export const Operation = (props: {
  operation?: LaboratoryOperation;
  historyItem?: LaboratoryHistory;
}) => {
  const { activeOperation, history } = useLaboratory();

  const operation = useMemo(() => {
    return props.operation ?? activeOperation ?? null;
  }, [props.operation, activeOperation]);

  const historyItem = useMemo(() => {
    return (
      props.historyItem ??
      history
        .filter(h => h.operation.id === operation?.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ??
      null
    );
  }, [history, props.historyItem, operation?.id]);

  const isReadOnly = useMemo(() => {
    return !!props.historyItem;
  }, [props.historyItem]);

  return (
    <div className="bg-card size-full">
      <ResizablePanelGroup direction="horizontal" className="size-full">
        <ResizablePanel defaultSize={25}>
          <Builder operation={operation} isReadOnly={isReadOnly} />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel minSize={10} defaultSize={40}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70}>
              <Query operation={operation} isReadOnly={isReadOnly} />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel minSize={10} defaultSize={30} className="!overflow-visible">
              <Tabs className="grid size-full grid-rows-[auto_1fr]" defaultValue="variables">
                <TabsList className="h-[49.5px] w-full justify-start rounded-none border-b bg-transparent p-3">
                  <TabsTrigger value="variables" className="grow-0 rounded-sm">
                    Variables
                  </TabsTrigger>
                  <TabsTrigger value="headers" className="grow-0 rounded-sm">
                    Headers
                  </TabsTrigger>
                  <TabsTrigger value="extensions" className="grow-0 rounded-sm">
                    Extensions
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="variables">
                  <Variables operation={operation} isReadOnly={isReadOnly} />
                </TabsContent>
                <TabsContent value="headers">
                  <Headers operation={operation} isReadOnly={isReadOnly} />
                </TabsContent>
                <TabsContent value="extensions">
                  <Extensions operation={operation} isReadOnly={isReadOnly} />
                </TabsContent>
              </Tabs>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel minSize={10} defaultSize={35}>
          {historyItem ? (
            <>
              {'responses' in historyItem ? (
                <ResponseSubscription historyItem={historyItem} />
              ) : (
                <Response historyItem={historyItem} />
              )}
            </>
          ) : (
            <Empty className="size-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HistoryIcon className="text-muted-foreground size-6" />
                </EmptyMedia>
                <EmptyTitle>No history yet</EmptyTitle>
                <EmptyDescription>
                  No response available yet. Run your operation to see the response here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
