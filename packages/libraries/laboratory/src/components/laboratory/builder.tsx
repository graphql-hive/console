import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLUnionType,
  OperationTypeNode,
  type GraphQLArgument,
  type GraphQLField,
} from 'graphql';
import { throttle } from 'lodash';
import {
  BoxIcon,
  ChevronDownIcon,
  CopyMinusIcon,
  CuboidIcon,
  FolderIcon,
  ListTreeIcon,
  RotateCcwIcon,
  SearchIcon,
  SettingsIcon,
  TextAlignStartIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LaboratoryOperation } from '../../lib/operations';
import {
  getFieldByPath,
  getOpenPaths,
  isArgInQuery,
  isPathInQuery,
  searchSchemaPaths,
} from '../../lib/operations.utils';
import { cn, splitIdentifier } from '../../lib/utils';
import { GraphQLType } from '../graphql-type';
import { GraphQLIcon } from '../icons';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../ui/input-group';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useLaboratory } from './context';

export const BuilderArgument = (props: {
  field: GraphQLArgument;
  path: string[];
  isReadOnly?: boolean;
  operation?: LaboratoryOperation | null;
  operationName?: string | null;
}) => {
  const {
    schema,
    activeOperation,
    addArgToActiveOperation,
    deleteArgFromActiveOperation,
    activeTab,
  } = useLaboratory();

  const operation = useMemo(() => {
    return props.operation ?? activeOperation ?? null;
  }, [props.operation, activeOperation]);

  const path = useMemo(() => {
    return props.path.join('.');
  }, [props.path]);

  const isInQuery = useMemo(() => {
    return isArgInQuery(operation?.query ?? '', path, props.field.name);
  }, [operation?.query, path, props.field.name]);

  return (
    <Button
      key={props.field.name}
      variant="ghost"
      className={cn('text-muted-foreground p-1! w-full justify-start text-xs', {
        'text-foreground-primary': isInQuery,
      })}
      size="sm"
    >
      <div className="size-4" />
      <Checkbox
        onClick={e => e.stopPropagation()}
        checked={isInQuery}
        disabled={activeTab?.type !== 'operation' || props.isReadOnly}
        onCheckedChange={checked => {
          if (!schema) {
            return;
          }

          if (checked) {
            addArgToActiveOperation(
              props.path.join('.'),
              props.field.name,
              schema,
              props.operationName,
            );
          } else {
            deleteArgFromActiveOperation(
              props.path.join('.'),
              props.field.name,
              props.operationName,
            );
          }
        }}
      />
      <BoxIcon className="size-4 text-rose-400" />
      {props.field.name}: <GraphQLType type={props.field.type} />
    </Button>
  );
};

export const BuilderScalarField = (props: {
  field: GraphQLField<unknown, unknown, unknown>;
  path: string[];
  openPaths: string[];
  setOpenPaths: (openPaths: string[]) => void;
  visiblePaths?: Set<string> | null;
  forcedOpenPaths?: Set<string> | null;
  isSearchActive?: boolean;
  isReadOnly?: boolean;
  operation?: LaboratoryOperation | null;
  operationName?: string | null;
  searchValue?: string;
  label?: React.ReactNode;
  disableChildren?: boolean;
}) => {
  const { activeOperation, addPathToActiveOperation, deletePathFromActiveOperation, activeTab } =
    useLaboratory();

  const operation = useMemo(() => {
    return props.operation ?? activeOperation ?? null;
  }, [props.operation, activeOperation]);

  const path = useMemo(() => {
    return props.path.join('.');
  }, [props.path]);

  const isOpen = useMemo(() => {
    return props.openPaths.includes(path) || !!props.forcedOpenPaths?.has(path);
  }, [props.openPaths, props.forcedOpenPaths, path]);

  const setIsOpen = useCallback(
    (isOpen: boolean) => {
      props.setOpenPaths(
        isOpen ? [...props.openPaths, path] : props.openPaths.filter(openPath => openPath !== path),
      );
    },
    [path, props],
  );

  const isInQuery = useMemo(() => {
    return isPathInQuery(operation?.query ?? '', path, props.operationName);
  }, [operation?.query, path, props.operationName]);

  const args = useMemo(() => {
    return (props.field as GraphQLField<unknown, unknown, unknown>).args ?? [];
  }, [props.field]);

  const hasArgs = useMemo(() => {
    return args.some(arg =>
      isArgInQuery(operation?.query ?? '', path, arg.name, props.operationName),
    );
  }, [operation?.query, args, path, props.operationName]);

  const shouldHighlight = useMemo(() => {
    const splittedName = splitIdentifier(props.field.name);

    return splittedName.some(p => props.searchValue?.toLowerCase().includes(p.toLowerCase()));
  }, [props.searchValue, props.field.name]);

  if (props.isSearchActive && props.visiblePaths && !props.visiblePaths.has(path)) {
    return null;
  }

  if (props.disableChildren) {
    return (
      <Button
        variant="ghost"
        className={cn(
          'text-muted-foreground bg-card p-1! group sticky top-0 z-10 w-full justify-start overflow-hidden text-xs',
          {
            'text-foreground-primary': isInQuery,
          },
        )}
        style={{
          top: `${(props.path.length - 2) * 32}px`,
        }}
        size="sm"
      >
        <div className="bg-card absolute left-0 top-0 -z-20 size-full" />
        <div className="group-hover:bg-accent/50 absolute left-0 top-0 -z-10 size-full transition-colors" />
        <Checkbox
          onClick={e => e.stopPropagation()}
          checked={isInQuery}
          disabled={activeTab?.type !== 'operation' || props.isReadOnly}
          onCheckedChange={checked => {
            if (checked) {
              setIsOpen(true);
              addPathToActiveOperation(path, props.operationName);
            } else {
              deletePathFromActiveOperation(path, props.operationName);
            }
          }}
        />
        <BoxIcon className="size-4 text-rose-400" />
        {props.label ?? (
          <span
            className={cn({
              'text-primary-foreground bg-primary -mx-0.5 rounded-sm px-0.5': shouldHighlight,
            })}
          >
            {props.field.name}
          </span>
        )}
        : <GraphQLType type={props.field.type} />
      </Button>
    );
  }

  if (args.length > 0) {
    return (
      <Collapsible key={props.field.name} open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'text-muted-foreground bg-card p-1! group sticky top-0 z-10 w-full justify-start overflow-hidden text-xs',
              {
                'text-foreground-primary': isInQuery,
              },
            )}
            style={{
              top: `${(props.path.length - 2) * 32}px`,
            }}
            size="sm"
          >
            <div className="bg-card absolute left-0 top-0 -z-20 size-full" />
            <div className="group-hover:bg-accent/50 absolute left-0 top-0 -z-10 size-full transition-colors" />
            <ChevronDownIcon
              className={cn('text-muted-foreground size-4 transition-all', {
                '-rotate-90': !isOpen,
              })}
            />
            <Checkbox
              onClick={e => e.stopPropagation()}
              checked={isInQuery}
              disabled={activeTab?.type !== 'operation' || props.isReadOnly}
              onCheckedChange={checked => {
                if (checked) {
                  setIsOpen(true);
                  addPathToActiveOperation(path, props.operationName);
                } else {
                  deletePathFromActiveOperation(path, props.operationName);
                }
              }}
            />
            <BoxIcon className="size-4 text-rose-400" />
            {props.label ?? (
              <span
                className={cn({
                  'text-primary-foreground bg-primary -mx-0.5 rounded-sm px-0.5': shouldHighlight,
                })}
              >
                {props.field.name}
              </span>
            )}
            : <GraphQLType type={props.field.type} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-border relative z-0 ml-3 flex flex-col border-l pl-2">
          {isOpen && (
            <div>
              {args.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'text-muted-foreground bg-card p-1! group sticky top-0 z-10 w-full justify-start overflow-hidden text-xs',
                        {
                          'text-foreground-primary': hasArgs,
                        },
                      )}
                      style={{
                        top: `${(props.path.length - 1) * 32}px`,
                      }}
                      size="sm"
                    >
                      <ChevronDownIcon
                        className={cn('text-muted-foreground size-4 transition-all', {
                          '-rotate-90': !isOpen,
                        })}
                      />
                      <Checkbox onClick={e => e.stopPropagation()} checked={hasArgs} disabled />
                      <CuboidIcon className="size-4 text-rose-400" />
                      [arguments]
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-border ml-3 flex flex-col border-l pl-2">
                    {args.map(arg => (
                      <BuilderArgument
                        key={arg.name}
                        field={arg}
                        path={[...props.path]}
                        isReadOnly={props.isReadOnly}
                        operation={operation}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Button
      key={props.field.name}
      variant="ghost"
      className={cn('text-muted-foreground p-1! w-full justify-start text-xs', {
        'text-foreground-primary': isInQuery,
      })}
      size="sm"
    >
      <div className="size-4" />
      <Checkbox
        onClick={e => e.stopPropagation()}
        checked={isInQuery}
        disabled={activeTab?.type !== 'operation'}
        onCheckedChange={checked => {
          if (checked) {
            addPathToActiveOperation(props.path.join('.'), props.operationName);
          } else {
            deletePathFromActiveOperation(props.path.join('.'), props.operationName);
          }
        }}
      />
      <BoxIcon className="size-4 text-rose-400" />
      {props.label ?? (
        <span
          className={cn({
            'text-primary-foreground bg-primary -mx-0.5 rounded-sm px-0.5': shouldHighlight,
          })}
        >
          {props.field.name}
        </span>
      )}
      : <GraphQLType type={props.field.type} />
    </Button>
  );
};

export const BuilderObjectField = (props: {
  field: GraphQLField<unknown, unknown, unknown>;
  path: string[];
  openPaths: string[];
  setOpenPaths: (openPaths: string[]) => void;
  visiblePaths?: Set<string> | null;
  forcedOpenPaths?: Set<string> | null;
  isSearchActive?: boolean;
  isReadOnly?: boolean;
  operation?: LaboratoryOperation | null;
  operationName?: string | null;
  searchValue?: string;
  label?: React.ReactNode;
  disableChildren?: boolean;
}) => {
  const {
    schema,
    activeOperation,
    addPathToActiveOperation,
    deletePathFromActiveOperation,
    activeTab,
  } = useLaboratory();

  const operation = useMemo(() => {
    return props.operation ?? activeOperation ?? null;
  }, [props.operation, activeOperation]);

  const path = useMemo(() => {
    return props.path.join('.');
  }, [props.path]);

  const isOpen = useMemo(() => {
    return props.openPaths.includes(path) || !!props.forcedOpenPaths?.has(path);
  }, [props.openPaths, props.forcedOpenPaths, path]);

  const setIsOpen = useCallback(
    (isOpen: boolean) => {
      props.setOpenPaths(
        isOpen ? [...props.openPaths, path] : props.openPaths.filter(openPath => openPath !== path),
      );
    },
    [path, props],
  );

  const fields = useMemo(
    () =>
      Object.values(
        (
          schema?.getType(props.field.type.toString().replace(/\[|\]|!/g, '')) as GraphQLObjectType
        )?.getFields?.() ?? {},
      ),
    [schema, props.field.type],
  );

  const args = useMemo(() => {
    return (props.field as GraphQLField<unknown, unknown, unknown>).args ?? [];
  }, [props.field]);

  const hasArgs = useMemo(() => {
    return args.some(arg => isArgInQuery(operation?.query ?? '', props.path.join('.'), arg.name));
  }, [operation?.query, args, props.path]);

  const isInQuery = useMemo(() => {
    return isPathInQuery(operation?.query ?? '', path);
  }, [operation?.query, path]);

  const shouldHighlight = useMemo(() => {
    const splittedName = splitIdentifier(props.field.name);

    return splittedName.some(p => props.searchValue?.toLowerCase().includes(p.toLowerCase()));
  }, [props.searchValue, props.field.name]);

  if (props.isSearchActive && props.visiblePaths && !props.visiblePaths.has(path)) {
    return null;
  }

  if (props.disableChildren) {
    return (
      <Button
        variant="ghost"
        className={cn(
          'text-muted-foreground bg-card p-1! group sticky top-0 z-10 w-full justify-start overflow-hidden text-xs',
          {
            'text-foreground-primary': isInQuery,
          },
        )}
        style={{
          top: `${(props.path.length - 2) * 32}px`,
        }}
        size="sm"
      >
        <div className="bg-card absolute left-0 top-0 -z-20 size-full" />
        <div className="group-hover:bg-accent/50 absolute left-0 top-0 -z-10 size-full transition-colors" />
        <Checkbox
          onClick={e => e.stopPropagation()}
          checked={isInQuery}
          disabled={activeTab?.type !== 'operation' || props.isReadOnly}
          onCheckedChange={checked => {
            if (checked) {
              setIsOpen(true);
              addPathToActiveOperation(path, props.operationName);
            } else {
              deletePathFromActiveOperation(path, props.operationName);
            }
          }}
        />
        <BoxIcon className="size-4 text-rose-400" />
        {props.label ?? (
          <span
            className={cn({
              'text-primary-foreground bg-primary -mx-0.5 rounded-sm px-0.5': shouldHighlight,
            })}
          >
            {props.field.name}
          </span>
        )}
        : <GraphQLType type={props.field.type} />
      </Button>
    );
  }

  return (
    <Collapsible key={props.field.name} open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'text-muted-foreground bg-card p-1! group sticky top-0 z-10 w-full justify-start overflow-hidden text-xs',
            {
              'text-foreground-primary': isInQuery,
            },
          )}
          style={{
            top: `${(props.path.length - 2) * 32}px`,
          }}
          size="sm"
        >
          <div className="bg-card absolute left-0 top-0 -z-20 size-full" />
          <div className="group-hover:bg-accent/50 absolute left-0 top-0 -z-10 size-full transition-colors" />
          <ChevronDownIcon
            className={cn('text-muted-foreground size-4 transition-all', {
              '-rotate-90': !isOpen,
            })}
          />
          <Checkbox
            onClick={e => e.stopPropagation()}
            checked={isInQuery}
            disabled={activeTab?.type !== 'operation' || props.isReadOnly}
            onCheckedChange={checked => {
              if (checked) {
                setIsOpen(true);
                addPathToActiveOperation(path, props.operationName);
              } else {
                deletePathFromActiveOperation(path, props.operationName);
              }
            }}
          />
          <BoxIcon className="size-4 text-rose-400" />
          {props.label ?? (
            <span
              className={cn({
                'text-primary-foreground bg-primary -mx-0.5 rounded-sm px-0.5': shouldHighlight,
              })}
            >
              {props.field.name}
            </span>
          )}
          : <GraphQLType type={props.field.type} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-border relative z-0 ml-4 flex flex-col border-l pl-1">
        {isOpen && (
          <div>
            {args.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'text-muted-foreground bg-card p-1! group sticky top-0 z-10 w-full justify-start overflow-hidden text-xs',
                      {
                        'text-foreground-primary': hasArgs,
                      },
                    )}
                    style={{
                      top: `${(props.path.length - 1) * 32}px`,
                    }}
                    size="sm"
                  >
                    <ChevronDownIcon
                      className={cn('text-muted-foreground size-4 transition-all', {
                        '-rotate-90': !isOpen,
                      })}
                    />
                    <Checkbox onClick={e => e.stopPropagation()} checked={hasArgs} disabled />
                    <CuboidIcon className="size-4 text-rose-400" />
                    [arguments]
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-border ml-4 flex flex-col border-l pl-1">
                  {args.map(arg => (
                    <BuilderArgument
                      key={arg.name}
                      field={arg}
                      path={[...props.path]}
                      operation={operation}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
            {fields?.map(child => (
              <BuilderField
                key={child.name}
                field={child}
                path={[...props.path, child.name]}
                openPaths={props.openPaths}
                setOpenPaths={props.setOpenPaths}
                visiblePaths={props.visiblePaths}
                forcedOpenPaths={props.forcedOpenPaths}
                isSearchActive={props.isSearchActive}
                isReadOnly={props.isReadOnly}
                operation={operation}
                operationName={props.operationName}
                searchValue={props.searchValue}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const BuilderField = (props: {
  field: GraphQLField<unknown, unknown, unknown>;
  path: string[];
  openPaths: string[];
  setOpenPaths: (openPaths: string[]) => void;
  visiblePaths?: Set<string> | null;
  forcedOpenPaths?: Set<string> | null;
  isSearchActive?: boolean;
  operation?: LaboratoryOperation | null;
  operationName?: string | null;
  isReadOnly?: boolean;
  searchValue?: string;
  label?: React.ReactNode;
  disableChildren?: boolean;
}) => {
  const { schema } = useLaboratory();

  const type = schema?.getType(props.field.type.toString().replace(/\[|\]|!/g, ''));

  if (
    !type ||
    type instanceof GraphQLScalarType ||
    type instanceof GraphQLEnumType ||
    type instanceof GraphQLUnionType
  ) {
    return (
      <BuilderScalarField
        field={props.field}
        path={props.path}
        openPaths={props.openPaths}
        setOpenPaths={props.setOpenPaths}
        visiblePaths={props.visiblePaths}
        forcedOpenPaths={props.forcedOpenPaths}
        isSearchActive={props.isSearchActive}
        isReadOnly={props.isReadOnly}
        operation={props.operation}
        operationName={props.operationName}
        searchValue={props.searchValue}
        label={props.label}
        disableChildren={props.disableChildren}
      />
    );
  }

  return (
    <BuilderObjectField
      field={props.field}
      path={props.path}
      openPaths={props.openPaths}
      setOpenPaths={props.setOpenPaths}
      visiblePaths={props.visiblePaths}
      forcedOpenPaths={props.forcedOpenPaths}
      isSearchActive={props.isSearchActive}
      isReadOnly={props.isReadOnly}
      operation={props.operation}
      operationName={props.operationName}
      searchValue={props.searchValue}
      label={props.label}
      disableChildren={props.disableChildren}
    />
  );
};

enum BuilderSearchResultMode {
  LIST = 'list',
  TREE = 'tree',
}

export const BuilderSearchResults = (props: {
  type: 'query' | 'mutation' | 'subscription';
  fields: GraphQLField<unknown, unknown, unknown>[];
  openPaths: string[];
  setOpenPaths: (openPaths: string[]) => void;
  visiblePaths: Set<string> | null;
  matchedPaths: string[];
  forcedOpenPaths: Set<string> | null;
  isSearchActive: boolean;
  mode: BuilderSearchResultMode;
  isReadOnly: boolean;
  operation: LaboratoryOperation | null;
  operationName?: string | null;
  searchValue: string;
  schema: GraphQLSchema;
  tab: OperationTypeNode;
}) => {
  if (props.mode === BuilderSearchResultMode.LIST) {
    return props.matchedPaths.map(path => {
      const field = getFieldByPath(path, props.schema);

      if (!field) {
        return null;
      }

      return (
        <BuilderField
          key={path}
          field={field}
          path={[path]}
          openPaths={props.openPaths}
          setOpenPaths={props.setOpenPaths}
          visiblePaths={props.visiblePaths}
          forcedOpenPaths={props.forcedOpenPaths}
          isSearchActive={props.isSearchActive}
          isReadOnly={props.isReadOnly}
          operation={props.operation}
          operationName={props.operationName}
          searchValue={props.searchValue}
          disableChildren
          label={
            <span>
              {path.split('.').map((part, index) => {
                const splittedPart = splitIdentifier(part);

                const isMatch = splittedPart.some(p =>
                  props.searchValue.toLowerCase().includes(p.toLowerCase()),
                );

                if (isMatch) {
                  return (
                    <Fragment key={index}>
                      <span className="text-primary-foreground bg-primary -mx-0.5 rounded-sm px-0.5">
                        {part}
                      </span>
                      {index < path.split('.').length - 1 && '.'}
                    </Fragment>
                  );
                }

                return (
                  <span key={index}>
                    {part}
                    {index < path.split('.').length - 1 && '.'}
                  </span>
                );
              })}
            </span>
          }
        />
      );
    });
  }

  return props.fields
    .filter(field => props.visiblePaths?.has(`${props.tab}.${field.name}`))
    .map(field => {
      return (
        <BuilderField
          key={field.name}
          field={field}
          path={[props.tab, field.name]}
          openPaths={props.openPaths}
          setOpenPaths={props.setOpenPaths}
          visiblePaths={props.visiblePaths}
          forcedOpenPaths={props.forcedOpenPaths}
          isSearchActive={props.isSearchActive}
          isReadOnly={props.isReadOnly}
          operation={props.operation}
          operationName={props.operationName}
          searchValue={props.searchValue}
        />
      );
    });
};

export const Builder = (props: {
  operation?: LaboratoryOperation | null;
  operationName?: string | null;
  isReadOnly?: boolean;
}) => {
  const {
    schema,
    activeOperation,
    endpoint,
    setEndpoint,
    defaultEndpoint,
    tabs,
    addTab,
    setActiveTab,
    shouldPollSchema,
  } = useLaboratory();

  const [endpointValue, setEndpointValue] = useState<string>(endpoint ?? '');
  const [searchValue, setSearchValue] = useState<string>('');
  const deferredSearchValue = useDeferredValue(
    searchValue[searchValue.length - 1] === '.' ? searchValue.slice(0, -1) : searchValue,
  );
  const [openPaths, setOpenPaths] = useState<string[]>([]);
  const [tabValue, setTabValue] = useState<OperationTypeNode>(OperationTypeNode.QUERY);

  const operation = useMemo(() => {
    return props.operation ?? activeOperation ?? null;
  }, [props.operation, activeOperation]);

  useEffect(() => {
    if (schema) {
      const newOpenPaths = getOpenPaths(operation?.query ?? '');

      if (newOpenPaths.length > 0) {
        setOpenPaths(newOpenPaths);
        setTabValue(newOpenPaths[0] as OperationTypeNode);
      }
    }
  }, [schema, operation?.query]);

  const queryFields = useMemo(
    () => Object.values(schema?.getQueryType()?.getFields?.() ?? {}),
    [schema],
  );

  const mutationFields = useMemo(
    () => Object.values(schema?.getMutationType()?.getFields?.() ?? {}),
    [schema],
  );

  const subscriptionFields = useMemo(
    () => Object.values(schema?.getSubscriptionType()?.getFields?.() ?? {}),
    [schema],
  );

  const isSearchActive = deferredSearchValue.trim().length > 0;

  const searchResult = useMemo(() => {
    if (!schema || !isSearchActive) {
      return null;
    }

    return searchSchemaPaths(schema, deferredSearchValue, {
      maxDepth: 8,
      maxMatches: 100,
      maxNodes: 10000,
      operationTypes: [tabValue],
    });
  }, [schema, deferredSearchValue, isSearchActive, tabValue]);

  const visiblePaths = isSearchActive ? (searchResult?.visiblePaths ?? null) : null;
  const forcedOpenPaths =
    isSearchActive && deferredSearchValue.includes('.')
      ? (searchResult?.forcedOpenPaths ?? null)
      : null;

  const [searchResultMode, setSearchResultMode] = useState<BuilderSearchResultMode>(
    BuilderSearchResultMode.TREE,
  );

  const throttleSetEndpoint = useMemo(
    () =>
      throttle((endpoint: string) => {
        setEndpoint(endpoint);
      }, 1000),
    [setEndpoint],
  );

  useEffect(() => {
    throttleSetEndpoint(endpointValue);
  }, [endpointValue, throttleSetEndpoint]);

  const restoreEndpoint = useCallback(() => {
    setEndpointValue(endpoint ?? '');
    setEndpoint(defaultEndpoint ?? '');

    toast.success('Endpoint restored to default');
  }, [defaultEndpoint, setEndpointValue]);

  return (
    <div className="bg-card flex size-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-3 pt-3">
        <span className="text-base font-medium">Builder</span>
        <div className="ml-auto flex items-center gap-3">
          {shouldPollSchema && (
            <Button
              onClick={() => {
                const tab =
                  tabs.find(t => t.type === 'settings') ??
                  addTab({
                    type: 'settings',
                    data: {},
                  });

                setActiveTab(tab);
              }}
              variant="ghost"
              size="sm"
              className="p-1! h-6 rounded-sm !px-1.5"
            >
              <SettingsIcon className="size-4" />
              Introspection settings
            </Button>
          )}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setOpenPaths([])}
                  variant="ghost"
                  size="icon-sm"
                  className="p-1! size-6 rounded-sm"
                  disabled={openPaths.length === 0}
                >
                  <CopyMinusIcon className="text-muted-foreground size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collapse all</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      <div className="px-3 pt-3">
        <InputGroup>
          <InputGroupInput
            placeholder="Enter endpoint"
            value={endpointValue}
            onChange={e => setEndpointValue(e.currentTarget.value)}
          />
          <InputGroupAddon>
            <GraphQLIcon />
          </InputGroupAddon>
          {defaultEndpoint && (
            <InputGroupAddon align="inline-end">
              <Tooltip>
                <TooltipTrigger>
                  <InputGroupButton
                    className="rounded-full"
                    size="icon-xs"
                    onClick={restoreEndpoint}
                  >
                    <RotateCcwIcon className="size-4" />
                  </InputGroupButton>
                </TooltipTrigger>
                <TooltipContent>Restore default endpoint</TooltipContent>
              </Tooltip>
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>
      <div className="flex-1 overflow-hidden">
        {schema ? (
          <Tabs
            key={operation?.id}
            value={tabValue}
            onValueChange={value => setTabValue(value as OperationTypeNode)}
            className="flex size-full flex-col gap-0"
          >
            <div className="border-border flex items-center border-b p-3">
              <TabsList className="w-full">
                <TabsTrigger value="query" disabled={queryFields.length === 0} className="text-xs">
                  Query
                </TabsTrigger>
                <TabsTrigger
                  value="mutation"
                  disabled={mutationFields.length === 0}
                  className="text-xs"
                >
                  Mutation
                </TabsTrigger>
                <TabsTrigger
                  value="subscription"
                  disabled={subscriptionFields.length === 0}
                  className="text-xs"
                >
                  Subscription
                </TabsTrigger>
              </TabsList>
            </div>
            {schema && (
              <div className="border-border sticky top-0 z-10 border-b p-3">
                <InputGroup className="pr-0">
                  <InputGroupInput
                    placeholder="Search fields"
                    value={searchValue}
                    onChange={e => setSearchValue(e.currentTarget.value)}
                  />
                  <InputGroupAddon>
                    <SearchIcon className="text-muted-foreground size-4" />
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end" className="py-0 pr-1.5">
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      defaultValue={searchResultMode}
                      onValueChange={value => setSearchResultMode(value as BuilderSearchResultMode)}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <ToggleGroupItem
                            value={BuilderSearchResultMode.TREE}
                            aria-label="Toggle tree"
                            className="h-6 !rounded-l-sm !rounded-r-none border-r-0 p-2"
                          >
                            <ListTreeIcon className="size-4" />
                          </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent>Tree</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger>
                          <ToggleGroupItem
                            value={BuilderSearchResultMode.LIST}
                            aria-label="Toggle list"
                            className="h-6 !rounded-l-none !rounded-r-sm p-2"
                          >
                            <TextAlignStartIcon className="size-4" />
                          </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent>List</TooltipContent>
                      </Tooltip>
                    </ToggleGroup>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full font-mono">
                <div className="p-3">
                  <TabsContent value="query">
                    {isSearchActive ? (
                      <BuilderSearchResults
                        type="query"
                        fields={queryFields}
                        openPaths={openPaths}
                        setOpenPaths={setOpenPaths}
                        visiblePaths={visiblePaths}
                        matchedPaths={searchResult?.matchedPaths ?? []}
                        forcedOpenPaths={searchResult?.forcedOpenPaths ?? null}
                        isSearchActive={isSearchActive}
                        mode={searchResultMode}
                        isReadOnly={props.isReadOnly ?? false}
                        operation={operation}
                        searchValue={deferredSearchValue}
                        schema={schema}
                        tab={tabValue}
                      />
                    ) : (
                      queryFields.map(field => (
                        <BuilderField
                          key={field.name}
                          field={field}
                          path={['query', field.name]}
                          openPaths={openPaths}
                          setOpenPaths={setOpenPaths}
                          visiblePaths={visiblePaths}
                          forcedOpenPaths={forcedOpenPaths}
                          isSearchActive={isSearchActive}
                          isReadOnly={props.isReadOnly}
                          operation={operation}
                          operationName={props.operationName}
                          searchValue={deferredSearchValue}
                        />
                      ))
                    )}
                  </TabsContent>
                  <TabsContent value="mutation">
                    {isSearchActive ? (
                      <BuilderSearchResults
                        type="mutation"
                        fields={mutationFields}
                        openPaths={openPaths}
                        setOpenPaths={setOpenPaths}
                        visiblePaths={visiblePaths}
                        matchedPaths={searchResult?.matchedPaths ?? []}
                        forcedOpenPaths={searchResult?.forcedOpenPaths ?? null}
                        isSearchActive={isSearchActive}
                        mode={searchResultMode}
                        isReadOnly={props.isReadOnly ?? false}
                        operation={operation}
                        searchValue={deferredSearchValue}
                        schema={schema}
                        tab={tabValue}
                      />
                    ) : (
                      mutationFields.map(field => (
                        <BuilderField
                          key={field.name}
                          field={field}
                          path={['mutation', field.name]}
                          openPaths={openPaths}
                          setOpenPaths={setOpenPaths}
                          visiblePaths={visiblePaths}
                          forcedOpenPaths={forcedOpenPaths}
                          isSearchActive={isSearchActive}
                          isReadOnly={props.isReadOnly}
                          operation={operation}
                          operationName={props.operationName}
                          searchValue={deferredSearchValue}
                        />
                      ))
                    )}
                  </TabsContent>
                  <TabsContent value="subscription">
                    {isSearchActive ? (
                      <BuilderSearchResults
                        type="subscription"
                        fields={subscriptionFields}
                        openPaths={openPaths}
                        setOpenPaths={setOpenPaths}
                        visiblePaths={visiblePaths}
                        matchedPaths={searchResult?.matchedPaths ?? []}
                        forcedOpenPaths={searchResult?.forcedOpenPaths ?? null}
                        isSearchActive={isSearchActive}
                        mode={searchResultMode}
                        isReadOnly={props.isReadOnly ?? false}
                        operation={operation}
                        searchValue={deferredSearchValue}
                        schema={schema}
                        tab={tabValue}
                      />
                    ) : (
                      subscriptionFields.map(field => (
                        <BuilderField
                          key={field.name}
                          field={field}
                          path={['subscription', field.name]}
                          openPaths={openPaths}
                          setOpenPaths={setOpenPaths}
                          visiblePaths={visiblePaths}
                          forcedOpenPaths={forcedOpenPaths}
                          isSearchActive={isSearchActive}
                          isReadOnly={props.isReadOnly}
                          operation={operation}
                          operationName={props.operationName}
                          searchValue={deferredSearchValue}
                        />
                      ))
                    )}
                  </TabsContent>
                </div>
                <ScrollBar className="relative z-50" />
                <ScrollBar orientation="horizontal" className="relative z-50" />
              </ScrollArea>
            </div>
          </Tabs>
        ) : (
          <Empty className="px-0! h-96 w-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderIcon className="text-muted-foreground size-6" />
              </EmptyMedia>
              <EmptyTitle className="text-base">No endpoint selected</EmptyTitle>
              <EmptyDescription className="text-xs">
                You haven't selected any endpoint yet. Get started by selecting an endpoint.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
};
