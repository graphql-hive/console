import { useDeferredValue, useMemo, useState } from 'react';
import {
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  type GraphQLArgument,
  type GraphQLEnumValue,
  type GraphQLField,
  type GraphQLInputField,
  type GraphQLNamedType,
} from 'graphql';
import { BookOpenIcon, ChevronLeftIcon, SearchIcon } from 'lucide-react';
import { searchSchemaDocs } from '../../lib/docs-search';
import { cn } from '../../lib/utils';
import { GraphQLType } from '../graphql-type';
import { Markdown } from '../markdown';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { useLaboratory } from './context';

const namedTypeOf = (type: unknown): GraphQLNamedType | null => {
  let current = type as { ofType?: unknown; name?: string } | null;

  while (current && 'ofType' in current && current.ofType) {
    current = current.ofType as { ofType?: unknown; name?: string };
  }

  return (current as GraphQLNamedType | null) ?? null;
};

const Section = (props: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <div className="text-muted-foreground px-2 pt-2 text-[11px] font-medium uppercase tracking-wide">
      {props.title}
    </div>
    {props.children}
  </div>
);

const Description = (props: { description?: string | null }) =>
  props.description ? <Markdown className="px-2 py-1" content={props.description} /> : null;

const DeprecationBadge = (props: { reason?: string | null }) => (
  <div className="flex flex-col gap-1 px-2 py-1">
    <Badge variant="outline" className="text-muted-foreground w-fit">
      Deprecated
    </Badge>
    {props.reason ? <Markdown content={props.reason} /> : null}
  </div>
);

const Row = (props: { onClick?: () => void; children: React.ReactNode; className?: string }) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={props.onClick}
    className={cn('w-full justify-start px-2 text-xs font-normal', props.className)}
  >
    {props.children}
  </Button>
);

const TypeRow = (props: { type: unknown; onNavigate: (name: string) => void }) => {
  const named = namedTypeOf(props.type);

  return (
    <button
      type="button"
      className="cursor-pointer"
      onClick={() => named && props.onNavigate(named.name)}
    >
      <GraphQLType type={props.type as never} />
    </button>
  );
};

const ArgumentRow = (props: { arg: GraphQLArgument; onNavigate: (name: string) => void }) => (
  <div className="flex flex-col gap-0.5 px-2 py-1 text-xs">
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-rose-400">{props.arg.name}</span>
      <span className="text-muted-foreground">:</span>
      <TypeRow type={props.arg.type} onNavigate={props.onNavigate} />
      {props.arg.defaultValue === undefined ? null : (
        <span className="text-muted-foreground">= {JSON.stringify(props.arg.defaultValue)}</span>
      )}
    </div>
    <Description description={props.arg.description} />
    {props.arg.deprecationReason ? (
      <DeprecationBadge reason={props.arg.deprecationReason} />
    ) : null}
  </div>
);

const EnumValueRow = (props: { value: GraphQLEnumValue }) => (
  <div className="flex flex-col gap-0.5 px-2 py-1 text-xs">
    <span className="text-teal-400">{props.value.name}</span>
    <Description description={props.value.description} />
    {props.value.deprecationReason ? (
      <DeprecationBadge reason={props.value.deprecationReason} />
    ) : null}
  </div>
);

export const Docs = () => {
  const { schema, docsNavStack, pushDocs, popDocs, resetDocs } = useLaboratory();
  const [searchValue, setSearchValue] = useState('');
  const deferredSearch = useDeferredValue(searchValue);
  const isSearchActive = deferredSearch.trim().length > 0;

  const searchResult = useMemo(
    () => searchSchemaDocs(schema ?? null, deferredSearch),
    [schema, deferredSearch],
  );

  const goToType = (name: string) => pushDocs({ kind: 'type', name });
  const goToField = (typeName: string, fieldName: string) =>
    pushDocs({ kind: 'field', typeName, fieldName });

  const target = docsNavStack.at(-1) ?? null;

  // A target names a type that an endpoint switch or a poll may have removed, so
  // resolution can fail; falling back to the root beats a blank pane.
  const resolved = useMemo(() => {
    if (!schema || !target) {
      return null;
    }

    const type = schema.getType(target.kind === 'type' ? target.name : target.typeName);

    if (!type) {
      return null;
    }

    if (target.kind === 'type') {
      return { kind: 'type' as const, type };
    }

    if (!isObjectType(type) && !isInterfaceType(type) && !isInputObjectType(type)) {
      return null;
    }

    const field = type.getFields()[target.fieldName];

    return field ? { kind: 'field' as const, type, field } : null;
  }, [schema, target]);

  const title = useMemo(() => {
    if (!resolved) {
      return 'Documentation';
    }

    return resolved.kind === 'type' ? resolved.type.name : resolved.field.name;
  }, [resolved]);

  const renderRoot = () => {
    if (!schema) {
      return null;
    }

    const roots = [
      { label: 'Query', type: schema.getQueryType() },
      { label: 'Mutation', type: schema.getMutationType() },
      { label: 'Subscription', type: schema.getSubscriptionType() },
    ].filter(root => root.type);

    return (
      <Section title="Root types">
        {roots.map(root => (
          <Row key={root.label} onClick={() => goToType(root.type!.name)}>
            <span className="text-muted-foreground">{root.label}:</span>
            <span className="text-amber-400">{root.type!.name}</span>
          </Row>
        ))}
      </Section>
    );
  };

  const renderType = (type: GraphQLNamedType) => {
    const sections: React.ReactNode[] = [];

    if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
      const fields = Object.values(type.getFields());

      if (fields.length > 0) {
        sections.push(
          <Section key="fields" title="Fields">
            {fields.map(field => (
              <Row key={field.name} onClick={() => goToField(type.name, field.name)}>
                <span className="text-rose-400">{field.name}</span>
                <span className="text-muted-foreground">:</span>
                <GraphQLType type={field.type} />
                {'deprecationReason' in field && field.deprecationReason ? (
                  <Badge variant="outline" className="text-muted-foreground ml-auto">
                    Deprecated
                  </Badge>
                ) : null}
              </Row>
            ))}
          </Section>,
        );
      }
    }

    if (isObjectType(type) || isInterfaceType(type)) {
      const interfaces = type.getInterfaces();

      if (interfaces.length > 0) {
        sections.push(
          <Section key="implements" title="Implements">
            {interfaces.map(iface => (
              <Row key={iface.name} onClick={() => goToType(iface.name)}>
                <span className="text-amber-400">{iface.name}</span>
              </Row>
            ))}
          </Section>,
        );
      }
    }

    if (isUnionType(type) || isInterfaceType(type)) {
      const possible = isUnionType(type) ? type.getTypes() : schema?.getPossibleTypes(type) ?? [];

      if (possible.length > 0) {
        sections.push(
          <Section key="possible" title={isUnionType(type) ? 'Possible types' : 'Implementations'}>
            {possible.map(possibleType => (
              <Row key={possibleType.name} onClick={() => goToType(possibleType.name)}>
                <span className="text-amber-400">{possibleType.name}</span>
              </Row>
            ))}
          </Section>,
        );
      }
    }

    if (isEnumType(type)) {
      sections.push(
        <Section key="values" title="Enum values">
          {type.getValues().map(value => (
            <EnumValueRow key={value.name} value={value} />
          ))}
        </Section>,
      );
    }

    return (
      <>
        <Description description={type.description} />
        {sections}
      </>
    );
  };

  const renderField = (
    type: GraphQLNamedType,
    field: GraphQLField<unknown, unknown> | GraphQLInputField,
  ) => {
    const args = 'args' in field ? field.args : [];

    return (
      <>
        <div className="text-muted-foreground px-2 pt-2 text-xs">
          on <span className="text-amber-400">{type.name}</span>
        </div>
        <Description description={field.description} />
        {field.deprecationReason ? <DeprecationBadge reason={field.deprecationReason} /> : null}
        <Section title="Type">
          <div className="px-2 py-1 text-xs">
            <TypeRow type={field.type} onNavigate={goToType} />
          </div>
        </Section>
        {args.length > 0 ? (
          <Section title="Arguments">
            {args.map(arg => (
              <ArgumentRow key={arg.name} arg={arg} onNavigate={goToType} />
            ))}
          </Section>
        ) : null}
      </>
    );
  };

  const renderSearch = () => {
    const isEmpty =
      searchResult.types.length === 0 &&
      searchResult.fields.length === 0 &&
      searchResult.enumValues.length === 0;

    if (isEmpty) {
      return (
        <Empty className="px-0! w-full">
          <EmptyHeader>
            <EmptyTitle className="text-base">No matches</EmptyTitle>
            <EmptyDescription className="text-xs">
              Nothing in this schema matches "{deferredSearch}".
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    return (
      <>
        {searchResult.types.length > 0 ? (
          <Section title="Types">
            {searchResult.types.map(type => (
              <Row key={type.name} onClick={() => goToType(type.name)}>
                <span className="text-amber-400">{type.name}</span>
              </Row>
            ))}
          </Section>
        ) : null}
        {searchResult.fields.length > 0 ? (
          <Section title="Fields">
            {searchResult.fields.map(field => (
              <Row
                key={`${field.typeName}.${field.fieldName}`}
                onClick={() => goToField(field.typeName, field.fieldName)}
              >
                <span className="text-muted-foreground">{field.typeName}.</span>
                <span className="text-rose-400">{field.fieldName}</span>
              </Row>
            ))}
          </Section>
        ) : null}
        {searchResult.enumValues.length > 0 ? (
          <Section title="Enum values">
            {searchResult.enumValues.map(value => (
              <Row
                key={`${value.typeName}.${value.valueName}`}
                onClick={() => goToType(value.typeName)}
              >
                <span className="text-muted-foreground">{value.typeName}.</span>
                <span className="text-teal-400">{value.valueName}</span>
              </Row>
            ))}
          </Section>
        ) : null}
      </>
    );
  };

  const renderBody = () => {
    if (!schema) {
      return (
        <Empty className="px-0! w-full">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenIcon className="text-muted-foreground size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-base">No schema yet</EmptyTitle>
            <EmptyDescription className="text-xs">
              Documentation appears once the Laboratory has introspected your endpoint.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    if (isSearchActive) {
      return renderSearch();
    }

    if (!resolved) {
      return renderRoot();
    }

    return resolved.kind === 'type'
      ? renderType(resolved.type)
      : renderField(resolved.type, resolved.field);
  };

  return (
    <div className="grid size-full grid-rows-[auto_auto_1fr] pb-0">
      <div className="border-border flex h-12 items-center gap-2 border-b p-3">
        {docsNavStack.length > 0 && !isSearchActive ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground p-1! size-6 rounded-sm"
            onClick={popDocs}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
        ) : null}
        <span className="truncate text-base font-medium">{title}</span>
        {docsNavStack.length > 0 && !isSearchActive ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground ml-auto h-6 px-2 text-xs"
            onClick={resetDocs}
          >
            Root
          </Button>
        ) : null}
      </div>
      <div className="border-border border-b p-3">
        <InputGroup>
          <InputGroupInput
            placeholder="Search the schema"
            value={searchValue}
            onChange={e => setSearchValue(e.currentTarget.value)}
          />
          <InputGroupAddon>
            <SearchIcon className="text-muted-foreground size-4" />
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div className="size-full overflow-hidden">
        <ScrollArea className="size-full">
          <div className="flex flex-col gap-1 p-3">{renderBody()}</div>
          <ScrollBar />
        </ScrollArea>
      </div>
    </div>
  );
};
