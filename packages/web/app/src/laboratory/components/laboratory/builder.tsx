import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  type GraphQLArgument,
  type GraphQLField,
} from 'graphql';
import { BoxIcon, ChevronDownIcon, CopyMinusIcon, CuboidIcon, FolderIcon } from 'lucide-react';
import { GraphQLType } from '@/laboratory/components/graphql-type';
import { useLaboratory } from '@/laboratory/components/laboratory/context';
import { Button } from '@/laboratory/components/ui/button';
import { Checkbox } from '@/laboratory/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/laboratory/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/laboratory/components/ui/tooltip';
import type { LaboratoryOperation } from '@/laboratory/lib/operations';
import { getOpenPaths, isArgInQuery, isPathInQuery } from '@/laboratory/lib/operations.utils';
import { cn } from '@/laboratory/lib/utils';

export const BuilderArgument = (props: {
  field: GraphQLArgument;
  path: string[];
  isReadOnly?: boolean;
  operation?: LaboratoryOperation | null;
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
      className={cn('text-neutral-10 p-1! w-full justify-start text-xs', {
        'text-neutral-11': isInQuery,
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
            addArgToActiveOperation(props.path.join('.'), props.field.name, schema);
          } else {
            deleteArgFromActiveOperation(props.path.join('.'), props.field.name);
          }
        }}
      />
      <BoxIcon className="size-4 text-rose-500" />
      {props.field.name}: <GraphQLType type={props.field.type} />
    </Button>
  );
};

export const BuilderScalarField = (props: {
  field: GraphQLField<unknown, unknown, unknown>;
  path: string[];
  openPaths: string[];
  setOpenPaths: (openPaths: string[]) => void;
  isReadOnly?: boolean;
  operation?: LaboratoryOperation | null;
}) => {
  const { activeOperation, addPathToActiveOperation, deletePathFromActiveOperation, activeTab } =
    useLaboratory();

  const operation = useMemo(() => {
    return props.operation ?? activeOperation ?? null;
  }, [props.operation, activeOperation]);

  const isOpen = useMemo(() => {
    return props.openPaths.includes(props.path.join('.'));
  }, [props.openPaths, props.path]);

  const setIsOpen = useCallback(
    (isOpen: boolean) => {
      props.setOpenPaths(
        isOpen
          ? [...props.openPaths, props.path.join('.')]
          : props.openPaths.filter(path => path !== props.path.join('.')),
      );
    },
    [props],
  );

  const path = useMemo(() => {
    return props.path.join('.');
  }, [props.path]);

  const isInQuery = useMemo(() => {
    return isPathInQuery(operation?.query ?? '', path);
  }, [operation?.query, path]);

  const args = useMemo(() => {
    return (props.field as GraphQLField<unknown, unknown, unknown>).args ?? [];
  }, [props.field]);

  const hasArgs = useMemo(() => {
    return args.some(arg => isArgInQuery(operation?.query ?? '', path, arg.name));
  }, [operation?.query, args, path]);

  if (args.length > 0) {
    return (
      <Collapsible key={props.field.name} open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'text-neutral-10 bg-card p-1! group sticky top-0 z-10 w-full justify-start overflow-hidden text-xs',
              {
                'text-neutral-11': isInQuery,
              },
            )}
            style={{
              top: `${(props.path.length - 2) * 32}px`,
            }}
            size="sm"
          >
            <div className="bg-card absolute left-0 top-0 -z-20 size-full" />
            <div className="group-hover:bg-accent absolute left-0 top-0 -z-10 size-full transition-colors" />
            <ChevronDownIcon
              className={cn('text-neutral-10 size-4 transition-all', {
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
                  addPathToActiveOperation(path);
                } else {
                  deletePathFromActiveOperation(path);
                }
              }}
            />
            <BoxIcon className="size-4 text-rose-400" />
            {props.field.name}: <GraphQLType type={props.field.type} />
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
                        'text-neutral-10 bg-card p-1! group sticky top-0 z-10 w-full justify-start overflow-hidden text-xs',
                        {
                          'text-neutral-11': hasArgs,
                        },
                      )}
                      style={{
                        top: `${(props.path.length - 1) * 32}px`,
                      }}
                      size="sm"
                    >
                      <ChevronDownIcon
                        className={cn('text-neutral-10 size-4 transition-all', {
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
      className={cn('text-neutral-10 p-1! w-full justify-start text-xs', {
        'text-neutral-11': isInQuery,
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
            addPathToActiveOperation(props.path.join('.'));
          } else {
            deletePathFromActiveOperation(props.path.join('.'));
          }
        }}
      />
      <BoxIcon className="size-4 text-rose-400" />
      {props.field.name}: <GraphQLType type={props.field.type} />
    </Button>
  );
};

export const BuilderObjectField = (props: {
  field: GraphQLField<unknown, unknown, unknown>;
  path: string[];
  openPaths: string[];
  setOpenPaths: (openPaths: string[]) => void;
  isReadOnly?: boolean;
  operation?: LaboratoryOperation | null;
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

  const isOpen = useMemo(() => {
    return props.openPaths.includes(props.path.join('.'));
  }, [props.openPaths, props.path]);

  const setIsOpen = useCallback(
    (isOpen: boolean) => {
      props.setOpenPaths(
        isOpen
          ? [...props.openPaths, props.path.join('.')]
          : props.openPaths.filter(path => path !== props.path.join('.')),
      );
    },
    [props],
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

  const path = useMemo(() => {
    return props.path.join('.');
  }, [props.path]);

  const isInQuery = useMemo(() => {
    return isPathInQuery(operation?.query ?? '', path);
  }, [operation?.query, path]);

  return (
    <Collapsible key={props.field.name} open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'text-neutral-10 bg-card p-1! group sticky top-0 z-10 w-full justify-start overflow-hidden text-xs',
            {
              'text-neutral-11': isInQuery,
            },
          )}
          style={{
            top: `${(props.path.length - 2) * 32}px`,
          }}
          size="sm"
        >
          <div className="bg-card absolute left-0 top-0 -z-20 size-full" />
          <div className="group-hover:bg-accent absolute left-0 top-0 -z-10 size-full transition-colors" />
          <ChevronDownIcon
            className={cn('text-neutral-10 size-4 transition-all', {
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
                addPathToActiveOperation(path);
              } else {
                deletePathFromActiveOperation(path);
              }
            }}
          />
          <BoxIcon className="size-4 text-rose-400" />
          {props.field.name}: <GraphQLType type={props.field.type} />
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
                      'text-neutral-10 bg-card p-1! group sticky top-0 z-10 w-full justify-start overflow-hidden text-xs',
                      {
                        'text-neutral-11': hasArgs,
                      },
                    )}
                    style={{
                      top: `${(props.path.length - 1) * 32}px`,
                    }}
                    size="sm"
                  >
                    <ChevronDownIcon
                      className={cn('text-neutral-10 size-4 transition-all', {
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
                isReadOnly={props.isReadOnly}
                operation={operation}
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
  operation?: LaboratoryOperation | null;
  isReadOnly?: boolean;
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
        isReadOnly={props.isReadOnly}
        operation={props.operation}
      />
    );
  }

  return (
    <BuilderObjectField
      field={props.field}
      path={props.path}
      openPaths={props.openPaths}
      setOpenPaths={props.setOpenPaths}
      isReadOnly={props.isReadOnly}
      operation={props.operation}
    />
  );
};

export const Builder = (props: {
  operation?: LaboratoryOperation | null;
  isReadOnly?: boolean;
}) => {
  const { schema, activeOperation } = useLaboratory();
  const [openPaths, setOpenPaths] = useState<string[]>([]);

  const operation = useMemo(() => {
    return props.operation ?? activeOperation ?? null;
  }, [props.operation, activeOperation]);

  useEffect(() => {
    if (schema) {
      const newOpenPaths = getOpenPaths(operation?.query ?? '');

      if (newOpenPaths.length > 0) {
        setOpenPaths(newOpenPaths);
        setTabValue(newOpenPaths[0]);
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

  const [tabValue, setTabValue] = useState<string>('query');

  return (
    <div className="bg-card flex size-full flex-col overflow-hidden">
      <div className="flex items-center px-3 pt-3">
        <span className="text-base font-medium">Builder</span>
        <div className="ml-auto flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setOpenPaths([])}
                variant="ghost"
                size="icon-sm"
                className="p-1! size-6 rounded-sm"
                disabled={openPaths.length === 0}
              >
                <CopyMinusIcon className="text-neutral-10 size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Collapse all</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {schema ? (
          <Tabs
            key={operation?.id}
            value={tabValue}
            onValueChange={setTabValue}
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
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full font-mono">
                <div className="p-3">
                  <TabsContent value="query">
                    {queryFields?.map(field => (
                      <BuilderField
                        key={field.name}
                        field={field}
                        path={['query', field.name]}
                        openPaths={openPaths}
                        setOpenPaths={setOpenPaths}
                        isReadOnly={props.isReadOnly}
                        operation={operation}
                      />
                    ))}
                  </TabsContent>
                  <TabsContent value="mutation">
                    {mutationFields?.map(field => (
                      <BuilderField
                        key={field.name}
                        field={field}
                        path={['mutation', field.name]}
                        openPaths={openPaths}
                        setOpenPaths={setOpenPaths}
                        isReadOnly={props.isReadOnly}
                        operation={operation}
                      />
                    ))}
                  </TabsContent>
                  <TabsContent value="subscription">
                    {subscriptionFields?.map(field => (
                      <BuilderField
                        key={field.name}
                        field={field}
                        path={['subscription', field.name]}
                        openPaths={openPaths}
                        setOpenPaths={setOpenPaths}
                        isReadOnly={props.isReadOnly}
                        operation={operation}
                      />
                    ))}
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
                <FolderIcon className="text-neutral-10 size-6" />
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
