import { useCallback, useMemo, useRef, useState } from 'react';
import { FileIcon, FoldersIcon, HistoryIcon, SettingsIcon } from 'lucide-react';
import * as z from 'zod';
import { Markdown } from '@/components/v2/markdown';
import { Collections } from '@/laboratory/components/laboratory/collections';
import { Command } from '@/laboratory/components/laboratory/command';
import {
  LaboratoryPermission,
  LaboratoryPermissions,
  LaboratoryProvider,
  useLaboratory,
  type LaboratoryApi,
} from '@/laboratory/components/laboratory/context';
import { Env } from '@/laboratory/components/laboratory/env';
import { History } from '@/laboratory/components/laboratory/history';
import { HistoryItem } from '@/laboratory/components/laboratory/history-item';
import { Operation } from '@/laboratory/components/laboratory/operation';
import { Preflight } from '@/laboratory/components/laboratory/preflight';
import { Settings } from '@/laboratory/components/laboratory/settings';
import { Tabs } from '@/laboratory/components/laboratory/tabs';
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/laboratory/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/laboratory/components/ui/empty';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/laboratory/components/ui/field';
import { Input } from '@/laboratory/components/ui/input';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/laboratory/components/ui/resizable';
import { Toaster } from '@/laboratory/components/ui/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/laboratory/components/ui/tooltip';
import { useCollections } from '@/laboratory/lib/collections';
import { useEndpoint } from '@/laboratory/lib/endpoint';
import { useEnv } from '@/laboratory/lib/env';
import { useHistory } from '@/laboratory/lib/history';
import { useOperations } from '@/laboratory/lib/operations';
import { LaboratoryPluginTab, usePlugins } from '@/laboratory/lib/plugins';
import { usePreflight } from '@/laboratory/lib/preflight';
import { useSettings } from '@/laboratory/lib/settings';
import { LaboratoryTabCustom, useTabs } from '@/laboratory/lib/tabs';
import { useTests } from '@/laboratory/lib/tests';
import { cn } from '@/laboratory/lib/utils';
import { useForm } from '@tanstack/react-form';

const addCollectionFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const updateEndpointFormSchema = z.object({
  endpoint: z.string().min(1, 'Endpoint is required'),
});

const addTestFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const PreflightPromptModal = (props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  onSubmit?: (value: string | null) => void;
}) => {
  const form = useForm({
    defaultValues: {
      value: props.defaultValue || null,
    },
    validators: {
      onSubmit: z.object({
        value: z.string().min(1, 'Value is required').nullable(),
      }),
    },
    onSubmit: ({ value }) => {
      props.onSubmit?.(value.value || null);
      props.onOpenChange(false);
      form.reset();
    },
  });

  return (
    <Dialog
      open={props.open}
      onOpenChange={open => {
        if (!form.state.isSubmitted) {
          void form.handleSubmit();
        }

        props.onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preflight prompt</DialogTitle>
        </DialogHeader>
        <form
          id="preflight-prompt-form"
          onSubmit={e => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="value">
              {field => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>{props.title}</FieldLabel>
                    {props.description && (
                      <FieldDescription>
                        <Markdown content={props.description} />
                      </FieldDescription>
                    )}
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value || ''}
                      onBlur={field.handleBlur}
                      onChange={e => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder={props.placeholder}
                      autoComplete="off"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form="preflight-prompt-form"
            onClick={() => {
              void form.handleSubmit();
            }}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const LaboratoryContent = () => {
  const {
    activeTab,
    addOperation,
    collections,
    addTab,
    setActiveTab,
    preflight,
    tabs,
    env,
    plugins,
    pluginsState,
    setPluginsState,
  } = useLaboratory();
  const laboratory = useLaboratory();
  const [activePanel, setActivePanel] = useState<
    'collections' | 'history' | 'tests' | 'settings' | null
  >(collections.length > 0 ? 'collections' : null);
  const [commandOpen, setCommandOpen] = useState(false);

  const contentNode = useMemo(() => {
    switch (activeTab?.type) {
      case 'operation':
        return <Operation />;
      case 'preflight':
        return <Preflight />;
      case 'env':
        return <Env />;
      case 'history':
        return <HistoryItem />;
      case 'settings':
        return <Settings />;
      default: {
        let pluginId: string | null = null;
        let customTab: LaboratoryPluginTab<Record<string, unknown>> | null = null;

        for (const plugin of plugins) {
          for (const tab of plugin.tabs ?? []) {
            if (tab.type === activeTab?.type) {
              customTab = tab;
              pluginId = plugin.id;
              break;
            }
          }
        }

        if (customTab && pluginId) {
          return customTab.component(
            activeTab as LaboratoryTabCustom,
            laboratory,
            pluginsState[pluginId] ?? {},
            (state: Record<string, unknown>) =>
              setPluginsState({ ...pluginsState, [pluginId]: state }),
          );
        }

        return (
          <Empty className="px-0! w-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileIcon className="text-neutral-10 size-6" />
              </EmptyMedia>
              <EmptyTitle>No operation selected</EmptyTitle>
              <EmptyDescription>
                You haven't selected any operation yet. Get started by selecting an operation or add
                a new one.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                size="sm"
                onClick={() => {
                  const operation = addOperation({
                    name: '',
                    query: '',
                    variables: '',
                    headers: '',
                    extensions: '',
                  });

                  const tab = addTab({
                    type: 'operation',
                    data: operation,
                  });

                  setActiveTab(tab);
                }}
              >
                Add operation
              </Button>
            </EmptyContent>
          </Empty>
        );
      }
    }
  }, [activeTab?.type, addOperation, addTab, setActiveTab]);

  return (
    <div className="flex size-full">
      <Command open={commandOpen} onOpenChange={setCommandOpen} />
      <div className="flex h-full w-12 flex-col">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'relative z-10 flex aspect-square h-12 w-full items-center justify-center border-l-2 border-transparent',
                {
                  'border-neutral-11': activePanel === 'collections',
                },
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActivePanel(activePanel === 'collections' ? null : 'collections')}
                className={cn('text-neutral-10 hover:text-neutral-11', {
                  'text-neutral-11': activePanel === 'collections',
                })}
              >
                <FoldersIcon className="size-5" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">Collections</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'relative z-10 flex aspect-square h-12 w-full items-center justify-center border-l-2 border-transparent',
                {
                  'border-neutral-11': activePanel === 'history',
                },
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
                className={cn('text-neutral-10 hover:text-neutral-11', {
                  'text-neutral-11': activePanel === 'history',
                })}
              >
                <HistoryIcon className="size-5" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">History</TooltipContent>
        </Tooltip>
        <div
          className={cn(
            'relative z-10 mt-auto flex aspect-square h-12 w-full items-center justify-center border-l-2 border-transparent',
            {
              'border-neutral-11': activePanel === 'settings',
            },
          )}
        >
          <Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
                    className={cn('text-neutral-10 hover:text-neutral-11', {
                      'text-neutral-11': activePanel === 'history',
                    })}
                  >
                    <SettingsIcon className="size-5" />
                  </Button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mb-2 w-56" align="start" side="right">
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => setCommandOpen(true)}>
                    Command Palette...
                    <DropdownMenuShortcut>⌘J</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    const tab =
                      tabs.find(t => t.type === 'env') ??
                      addTab({
                        type: 'env',
                        data: env ?? { variables: {} },
                      });

                    setActiveTab(tab);
                  }}
                >
                  Environment Variables
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    const tab =
                      tabs.find(t => t.type === 'preflight') ??
                      addTab({
                        type: 'preflight',
                        data: preflight ?? { script: '' },
                      });

                    setActiveTab(tab);
                  }}
                >
                  Preflight Script
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    const tab =
                      tabs.find(t => t.type === 'settings') ??
                      addTab({
                        type: 'settings',
                        data: {},
                      });

                    setActiveTab(tab);
                  }}
                >
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <ResizablePanelGroup direction="horizontal" className="h-full flex-1">
        <ResizablePanel minSize={10} defaultSize={17} hidden={!activePanel} className="border-l">
          {activePanel === 'collections' && <Collections />}
          {activePanel === 'history' && <History />}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel minSize={10} defaultSize={83} className="flex flex-col">
          <div className="w-full">
            <Tabs />
          </div>
          <div className="bg-neutral-3 flex-1 overflow-hidden">{contentNode}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export type LaboratoryProps = LaboratoryApi;

export const Laboratory = (
  props: Pick<
    LaboratoryProps,
    | 'permissions'
    | 'defaultEndpoint'
    | 'onEndpointChange'
    | 'defaultCollections'
    | 'onCollectionsChange'
    | 'onCollectionCreate'
    | 'onCollectionUpdate'
    | 'onCollectionDelete'
    | 'onCollectionOperationCreate'
    | 'onCollectionOperationUpdate'
    | 'onCollectionOperationDelete'
    | 'defaultOperations'
    | 'onOperationsChange'
    | 'defaultActiveOperationId'
    | 'onActiveOperationIdChange'
    | 'onOperationCreate'
    | 'onOperationUpdate'
    | 'onOperationDelete'
    | 'defaultHistory'
    | 'onHistoryChange'
    | 'onHistoryCreate'
    | 'onHistoryUpdate'
    | 'onHistoryDelete'
    | 'defaultTabs'
    | 'onTabsChange'
    | 'defaultPreflight'
    | 'onPreflightChange'
    | 'defaultEnv'
    | 'onEnvChange'
    | 'defaultActiveTabId'
    | 'onActiveTabIdChange'
    | 'defaultSettings'
    | 'onSettingsChange'
    | 'defaultTests'
    | 'onTestsChange'
    | 'plugins'
    | 'defaultPluginsState'
    | 'onPluginsStateChange'
  >,
) => {
  const checkPermissions = useCallback(
    (
      permission: `${keyof LaboratoryPermissions & string}:${keyof LaboratoryPermission & string}`,
    ) => {
      const [namespace, action] = permission.split(':');

      return (
        props.permissions?.[namespace as keyof LaboratoryPermissions]?.[
          action as keyof LaboratoryPermission
        ] ?? true
      );
    },
    [props.permissions],
  );

  const [isPreflightPromptModalOpen, setIsPreflightPromptModalOpen] = useState(false);

  const [preflightPromptModalProps, setPreflightPromptModalProps] = useState<{
    title?: string;
    description?: string;
    placeholder?: string;
    defaultValue?: string;
    onSubmit?: (value: string | null) => void;
  }>({
    title: undefined,
    description: undefined,
    placeholder: undefined,
    defaultValue: undefined,
    onSubmit: undefined,
  });

  const openPreflightPromptModal = useCallback(
    (props: {
      title?: string;
      description?: string;
      placeholder?: string;
      defaultValue?: string;
      onSubmit?: (value: string | null) => void;
    }) => {
      setPreflightPromptModalProps({
        title: props.title,
        description: props.description,
        placeholder: props.placeholder,
        defaultValue: props.defaultValue,
        onSubmit: props.onSubmit,
      });

      setTimeout(() => {
        setIsPreflightPromptModalOpen(true);
      }, 200);
    },
    [],
  );

  const settingsApi = useSettings(props);
  const envApi = useEnv(props);
  const preflightApi = usePreflight({
    ...props,
    envApi,
    openPreflightPromptModal,
  });

  const pluginsApi = usePlugins(props);
  const testsApi = useTests(props);
  const tabsApi = useTabs(props);
  const endpointApi = useEndpoint(props);
  const collectionsApi = useCollections({
    ...props,
    tabsApi,
  });

  const operationsApi = useOperations({
    ...props,
    collectionsApi,
    tabsApi,
    envApi,
    preflightApi,
    settingsApi,
    pluginsApi,
    checkPermissions,
  });

  const historyApi = useHistory(props);

  const [isAddCollectionDialogOpen, setIsAddCollectionDialogOpen] = useState(false);

  const [isUpdateEndpointDialogOpen, setIsUpdateEndpointDialogOpen] = useState(false);

  const [isAddTestDialogOpen, setIsAddTestDialogOpen] = useState(false);

  const openAddCollectionDialog = useCallback(() => {
    setIsAddCollectionDialogOpen(true);
  }, []);

  const openUpdateEndpointDialog = useCallback(() => {
    setIsUpdateEndpointDialogOpen(true);
  }, []);

  const openAddTestDialog = useCallback(() => {
    setIsAddTestDialogOpen(true);
  }, []);

  const addCollectionForm = useForm({
    defaultValues: {
      name: '',
    },
    validators: {
      onSubmit: addCollectionFormSchema,
    },
    onSubmit: ({ value }) => {
      collectionsApi.addCollection({
        name: value.name,
      });
      setIsAddCollectionDialogOpen(false);
    },
  });

  const updateEndpointForm = useForm({
    defaultValues: {
      endpoint: endpointApi.endpoint ?? '',
    },
    validators: {
      onSubmit: updateEndpointFormSchema,
    },
    onSubmit: ({ value }) => {
      endpointApi.setEndpoint(value.endpoint);
      setIsUpdateEndpointDialogOpen(false);
    },
  });

  const addTestForm = useForm({
    defaultValues: {
      name: '',
    },
    validators: {
      onSubmit: addTestFormSchema,
    },
    onSubmit: ({ value }) => {
      testsApi.addTest({ name: value.name });
      setIsAddTestDialogOpen(false);
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const [isFullScreen, setIsFullScreen] = useState(false);

  const goToFullScreen = useCallback(() => {
    setIsFullScreen(true);
  }, []);

  const exitFullScreen = useCallback(() => {
    setIsFullScreen(false);
  }, []);

  return (
    <div
      className={cn('hive-laboratory bg-neutral-3 size-full', {
        'fixed inset-0 z-50': isFullScreen,
      })}
      style={
        {
          '--color-primary': 'var(--color-orange-500)',
        } as React.CSSProperties
      }
      ref={containerRef}
    >
      <Toaster richColors closeButton position="top-right" />
      <Dialog open={isUpdateEndpointDialogOpen} onOpenChange={setIsUpdateEndpointDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update endpoint</DialogTitle>
            <DialogDescription>Update the endpoint of your laboratory.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <form
              id="update-endpoint-form"
              onSubmit={e => {
                e.preventDefault();
                void updateEndpointForm.handleSubmit();
              }}
            >
              <FieldGroup>
                <updateEndpointForm.Field name="endpoint">
                  {field => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                    return (
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={e => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Enter endpoint"
                        autoComplete="off"
                      />
                    );
                  }}
                </updateEndpointForm.Field>
              </FieldGroup>
            </form>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="update-endpoint-form">
              Update endpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PreflightPromptModal
        open={isPreflightPromptModalOpen}
        onOpenChange={setIsPreflightPromptModalOpen}
        {...preflightPromptModalProps}
      />
      <Dialog open={isAddCollectionDialogOpen} onOpenChange={setIsAddCollectionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add collection</DialogTitle>
            <DialogDescription>
              Add a new collection of operations to your laboratory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <form
              id="add-collection-form"
              onSubmit={e => {
                e.preventDefault();
                void addCollectionForm.handleSubmit();
              }}
            >
              <FieldGroup>
                <addCollectionForm.Field name="name">
                  {field => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={e => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Enter name of the collection"
                          autoComplete="off"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </addCollectionForm.Field>
              </FieldGroup>
            </form>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="add-collection-form">
              Add collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isAddTestDialogOpen} onOpenChange={setIsAddTestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add test</DialogTitle>
            <DialogDescription>Add a new test to your laboratory.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <form
              id="add-test-form"
              onSubmit={e => {
                e.preventDefault();
                void addTestForm.handleSubmit();
              }}
            >
              <FieldGroup>
                <addTestForm.Field name="name">
                  {field => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={e => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Enter name of the test"
                          autoComplete="off"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </addTestForm.Field>
              </FieldGroup>
            </form>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="add-test-form">
              Add test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LaboratoryProvider
        {...props}
        {...testsApi}
        {...settingsApi}
        {...pluginsApi}
        {...envApi}
        {...preflightApi}
        {...tabsApi}
        {...endpointApi}
        {...collectionsApi}
        {...operationsApi}
        {...historyApi}
        openAddCollectionDialog={openAddCollectionDialog}
        openUpdateEndpointDialog={openUpdateEndpointDialog}
        openAddTestDialog={openAddTestDialog}
        openPreflightPromptModal={openPreflightPromptModal}
        goToFullScreen={goToFullScreen}
        exitFullScreen={exitFullScreen}
        isFullScreen={isFullScreen}
        checkPermissions={checkPermissions}
      >
        <LaboratoryContent />
      </LaboratoryProvider>
    </div>
  );
};
