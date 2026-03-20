import { useMemo } from 'react';
import { parse, print } from 'graphql';
import {
  Box,
  Boxes,
  ClockIcon,
  GitForkIcon,
  Layers2Icon,
  ListOrderedIcon,
  LucideProps,
  NetworkIcon,
  UnlinkIcon,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Flow, FlowNode } from '@/components/flow';
import { GraphQLIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export type QueryPlan = {
  kind: 'QueryPlan';
  node?: PlanNode | null;
};

export type PlanNode =
  | FetchNodePlan
  | BatchFetchNodePlan
  | SequenceNodePlan
  | ParallelNodePlan
  | FlattenNodePlan
  | ConditionNodePlan
  | SubscriptionNodePlan
  | DeferNodePlan;

export type OperationKind = 'Query' | 'Mutation' | 'Subscription' | string;

export type SubgraphFetchOperation = {
  documentStr: string;
  hash?: number | string;
  document?: unknown;
};

export type SelectionSet = SelectionItem[];

export type SelectionItem = {
  kind?: 'InlineFragment';
  typeCondition?: string | null;
  selections?:
    | {
        kind: 'Field';
        name: string;
      }[]
    | null;
};
// | {
//     kind?: 'FragmentSpread';
//     name: string;
//   }
// | Record<string, unknown>;

export type ValueObject = {
  [key: string]: Value;
};

export type Value =
  | string
  | number
  | boolean
  | null
  | { kind?: 'Variable'; variable?: string; name?: string }
  | Value[]
  | ValueObject;

export type FetchNodePlan = {
  kind: 'Fetch';
  serviceName: string;
  variableUsages?: string[] | Set<string> | null;
  operationKind?: OperationKind | null;
  operationName?: string | null;
  operation: string;
  requires?: SelectionItem[] | null;
  inputRewrites?: FetchRewrite[] | null;
  outputRewrites?: FetchRewrite[] | null;
};

export type BatchFetchNodePlan = {
  kind: 'BatchFetch';
  serviceName: string;
  variableUsages?: string[] | Set<string> | null;
  operationKind?: OperationKind | null;
  operationName?: string | null;
  operation: string;
  entityBatch: EntityBatch;
};

export type EntityBatch = {
  aliases: EntityBatchAlias[];
};

export type EntityBatchAlias = {
  alias: string;
  representationsVariableName: string;
  paths: FlattenNodePath;
  requires: SelectionSet;
  inputRewrites?: FetchRewrite[] | null;
  outputRewrites?: FetchRewrite[] | null;
};

export type FlattenNodePlan = {
  kind: 'Flatten';
  path: FlattenNodePath;
  node: PlanNode;
};

export type SequenceNodePlan = {
  kind: 'Sequence';
  nodes: PlanNode[];
};

export type ParallelNodePlan = {
  kind: 'Parallel';
  nodes: PlanNode[];
};

export type ConditionNodePlan = {
  kind: 'Condition';
  condition: string;
  ifClause?: PlanNode | null;
  elseClause?: PlanNode | null;
};

export type SubscriptionNodePlan = {
  kind: 'Subscription';
  primary: PlanNode;
};

export type DeferNodePlan = {
  kind: 'Defer';
  primary: DeferPrimary;
  deferred: DeferredNode[];
};

export type DeferPrimary = {
  subselection?: string | null;
  node?: PlanNode | null;
};

export type DeferredNode = {
  depends: DeferDependency[];
  label?: string | null;
  queryPath: string[];
  subselection?: string | null;
  node?: PlanNode | null;
};

export type DeferDependency = {
  id: string;
  deferLabel?: string | null;
};

export type FetchRewrite = ValueSetter | KeyRenamer;

export type ValueSetter = {
  path: FetchNodePathSegment[];
  setValueTo: string;
};

export type KeyRenamer = {
  path: FetchNodePathSegment[];
  renameKeyTo: string;
};

export type FetchNodePathSegment = { Key: string } | { TypenameEquals: string[] | Set<string> };

export type FlattenNodePathSegment =
  | { Field: string }
  | { TypeCondition: string[] | Set<string> }
  | '@';

export type FlattenNodePath = FlattenNodePathSegment[];

function indent(depth: number): string {
  return '  '.repeat(depth);
}

function normalizeStringSet(value: string[] | Set<string> | null | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : Array.from(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function renderFlattenPathSegment(seg: FlattenNodePathSegment): string {
  if (seg === '@') return '@';

  if (isObject(seg) && 'Field' in seg) {
    return String(seg.Field);
  }

  if (isObject(seg) && 'TypeCondition' in seg) {
    const names = normalizeStringSet(seg.TypeCondition as string[] | Set<string>);
    return `|[${names.join('|')}]`;
  }

  return String(seg);
}

export function renderFlattenPath(path: FlattenNodePath): string {
  let out = '';

  for (let i = 0; i < path.length; i++) {
    const current = path[i];
    const next = path[i + 1];
    out += renderFlattenPathSegment(current);

    if (next !== undefined) {
      const nextIsTypeCondition = isObject(next) && 'TypeCondition' in next;
      if (!nextIsTypeCondition) out += '.';
    }
  }

  return out;
}

export function renderSelectionSet(
  selectionSet: SelectionItem[] | null | undefined,
  depth = 0,
): string {
  if (!selectionSet?.length) return '';

  const lines: string[] = [];

  for (const item of selectionSet) {
    lines.push(`${indent(depth)}... on ${item.typeCondition}`);

    for (const property of item.selections ?? []) {
      lines.push(`${indent(depth + 1)}${property.name}`);
    }
  }

  return lines.join('\n');
}

export function renderQueryPlan(plan: QueryPlan): string {
  const lines: string[] = [];
  lines.push('QueryPlan {');

  if (plan.node) {
    lines.push(renderPlanNode(plan.node, 1));
  } else {
    lines.push(`${indent(1)}None`);
  }

  lines.push('}');
  return lines.join('\n');
}

export function renderPlanNode(node: PlanNode, depth = 0): string {
  switch (node.kind) {
    case 'Fetch':
      return renderFetchNode(node, depth);

    case 'BatchFetch':
      return renderBatchFetchNode(node, depth);

    case 'Flatten':
      return renderFlattenNode(node, depth);

    case 'Sequence':
      return renderSequenceNode(node, depth);

    case 'Parallel':
      return renderParallelNode(node, depth);

    case 'Condition':
      return renderConditionNode(node, depth);

    case 'Subscription':
      return renderSubscriptionNode(node, depth);

    case 'Defer':
      return renderDeferNode(node, depth);

    default:
      return `${indent(depth)}<UnknownNode kind="${(node as { kind?: string }).kind ?? 'unknown'}">`;
  }
}

export function renderFetchNode(node: FetchNodePlan, depth = 0): string {
  const lines: string[] = [];
  lines.push(`${indent(depth)}Fetch(service: "${node.serviceName}") {`);

  if (node.requires) {
    lines.push(`${indent(depth + 1)}requires {`);
    const requires = renderSelectionSet(node.requires, depth + 2);
    if (requires) lines.push(requires);
    lines.push(`${indent(depth + 1)}}`);
  }

  lines.push(`${indent(depth + 1)}operation {`);
  lines.push(renderMultilineBlock(print(parse(node.operation)), depth + 2));
  lines.push(`${indent(depth + 1)}}`);

  lines.push(`${indent(depth)}}`);
  return lines.join('\n');
}

export function renderBatchFetchNode(node: BatchFetchNodePlan, depth = 0): string {
  const lines: string[] = [];
  lines.push(`${indent(depth)}BatchFetch(service: "${node.serviceName}") {`);

  for (const alias of node.entityBatch.aliases) {
    lines.push(`${indent(depth + 1)}alias "${alias.alias}" {`);
    lines.push(`${indent(depth + 2)}representations: $${alias.representationsVariableName}`);
    lines.push(`${indent(depth + 2)}paths: [${renderFlattenPath(alias.paths)}]`);
    lines.push(`${indent(depth + 2)}requires {`);
    const requires = renderSelectionSet(alias.requires, depth + 3);
    if (requires) lines.push(requires);
    lines.push(`${indent(depth + 2)}}`);
    lines.push(`${indent(depth + 1)}}`);
  }

  lines.push(`${indent(depth + 1)}operation {`);
  lines.push(renderMultilineBlock(print(parse(node.operation)), depth + 2));
  lines.push(`${indent(depth + 1)}}`);

  return lines.join('\n');
}

export function renderFlattenNode(node: FlattenNodePlan, depth = 0): string {
  const lines: string[] = [];
  lines.push(`${indent(depth)}Flatten(path: "${renderFlattenPath(node.path)}") {`);
  lines.push(renderPlanNode(node.node, depth + 1));
  lines.push(`${indent(depth)}}`);
  return lines.join('\n');
}

export function renderSequenceNode(node: SequenceNodePlan, depth = 0): string {
  const lines: string[] = [];
  lines.push(`${indent(depth)}Sequence {`);
  for (const child of node.nodes) {
    lines.push(renderPlanNode(child, depth + 1));
  }
  lines.push(`${indent(depth)}}`);
  return lines.join('\n');
}

export function renderParallelNode(node: ParallelNodePlan, depth = 0): string {
  const lines: string[] = [];
  lines.push(`${indent(depth)}Parallel {`);
  for (const child of node.nodes) {
    lines.push(renderPlanNode(child, depth + 1));
  }
  lines.push(`${indent(depth)}}`);
  return lines.join('\n');
}

export function renderConditionNode(node: ConditionNodePlan, depth = 0): string {
  const lines: string[] = [];

  if (node.ifClause && !node.elseClause) {
    lines.push(`${indent(depth)}Include(if: $${node.condition}) {`);
    lines.push(renderPlanNode(node.ifClause, depth + 1));
    lines.push(`${indent(depth)}}`);
    return lines.join('\n');
  }

  if (!node.ifClause && node.elseClause) {
    lines.push(`${indent(depth)}Skip(if: $${node.condition}) {`);
    lines.push(renderPlanNode(node.elseClause, depth + 1));
    lines.push(`${indent(depth)}}`);
    return lines.join('\n');
  }

  if (node.ifClause && node.elseClause) {
    lines.push(`${indent(depth)}Condition(if: $${node.condition}) {`);
    lines.push(`${indent(depth + 1)}if {`);
    lines.push(renderPlanNode(node.ifClause, depth + 2));
    lines.push(`${indent(depth + 1)}}`);
    lines.push(`${indent(depth + 1)}else {`);
    lines.push(renderPlanNode(node.elseClause, depth + 2));
    lines.push(`${indent(depth + 1)}}`);
    lines.push(`${indent(depth)}}`);
    return lines.join('\n');
  }

  return `${indent(depth)}Condition(if: $${node.condition}) {}`;
}

export function renderSubscriptionNode(node: SubscriptionNodePlan, depth = 0): string {
  const lines: string[] = [];
  lines.push(`${indent(depth)}Subscription {`);
  lines.push(`${indent(depth + 1)}primary {`);
  lines.push(renderPlanNode(node.primary, depth + 2));
  lines.push(`${indent(depth + 1)}}`);
  lines.push(`${indent(depth)}}`);
  return lines.join('\n');
}

export function renderDeferNode(node: DeferNodePlan, depth = 0): string {
  const lines: string[] = [];
  lines.push(`${indent(depth)}Defer {`);

  lines.push(`${indent(depth + 1)}primary {`);
  if (node.primary.subselection) {
    lines.push(`${indent(depth + 2)}subselection: ${JSON.stringify(node.primary.subselection)}`);
  }
  if (node.primary.node) {
    lines.push(renderPlanNode(node.primary.node, depth + 2));
  }
  lines.push(`${indent(depth + 1)}}`);

  if (node.deferred.length > 0) {
    lines.push(`${indent(depth + 1)}deferred {`);
    for (const d of node.deferred) {
      lines.push(`${indent(depth + 2)}item {`);
      if (d.label) lines.push(`${indent(depth + 3)}label: ${JSON.stringify(d.label)}`);
      lines.push(`${indent(depth + 3)}queryPath: [${d.queryPath.join(', ')}]`);
      if (d.subselection) {
        lines.push(`${indent(depth + 3)}subselection: ${JSON.stringify(d.subselection)}`);
      }
      if (d.depends.length) {
        lines.push(
          `${indent(depth + 3)}depends: [${d.depends
            .map(x => (x.deferLabel ? `${x.id}:${x.deferLabel}` : x.id))
            .join(', ')}]`,
        );
      }
      if (d.node) {
        lines.push(renderPlanNode(d.node, depth + 3));
      }
      lines.push(`${indent(depth + 2)}}`);
    }
    lines.push(`${indent(depth + 1)}}`);
  }

  lines.push(`${indent(depth)}}`);
  return lines.join('\n');
}

function renderMultilineBlock(value: string, depth = 0): string {
  return value
    .split('\n')
    .map(line => `${indent(depth)}${line}`)
    .join('\n');
}

export type ExtractedOperation = {
  path: string;
  nodeKind: 'Fetch' | 'BatchFetch';
  serviceName: string;
  operationKind?: string | null;
  operationName?: string | null;
  graphql: string;
};

export function extractOperations(plan: QueryPlan): ExtractedOperation[] {
  if (!plan.node) return [];
  return extractOperationsFromNode(plan.node, 'root');
}

function extractOperationsFromNode(node: PlanNode, path: string): ExtractedOperation[] {
  switch (node.kind) {
    case 'Fetch':
      return [
        {
          path,
          nodeKind: 'Fetch',
          serviceName: node.serviceName,
          operationKind: node.operationKind ?? null,
          operationName: node.operationName ?? null,
          graphql: node.operation,
        },
      ];

    case 'BatchFetch':
      return [
        {
          path,
          nodeKind: 'BatchFetch',
          serviceName: node.serviceName,
          operationKind: node.operationKind ?? null,
          operationName: node.operationName ?? null,
          graphql: node.operation,
        },
      ];

    case 'Flatten':
      return extractOperationsFromNode(
        node.node,
        `${path}.flatten(${renderFlattenPath(node.path)})`,
      );

    case 'Sequence':
      return node.nodes.flatMap((child, i) =>
        extractOperationsFromNode(child, `${path}.sequence[${i}]`),
      );

    case 'Parallel':
      return node.nodes.flatMap((child, i) =>
        extractOperationsFromNode(child, `${path}.parallel[${i}]`),
      );

    case 'Condition': {
      const out: ExtractedOperation[] = [];
      if (node.ifClause) {
        out.push(...extractOperationsFromNode(node.ifClause, `${path}.if($${node.condition})`));
      }
      if (node.elseClause) {
        out.push(...extractOperationsFromNode(node.elseClause, `${path}.else($${node.condition})`));
      }
      return out;
    }

    case 'Subscription':
      return extractOperationsFromNode(node.primary, `${path}.subscription.primary`);

    case 'Defer': {
      const out: ExtractedOperation[] = [];
      if (node.primary.node) {
        out.push(...extractOperationsFromNode(node.primary.node, `${path}.defer.primary`));
      }
      node.deferred.forEach((d, i) => {
        if (d.node) {
          out.push(
            ...extractOperationsFromNode(
              d.node,
              `${path}.defer.deferred[${i}]${d.label ? `(${d.label})` : ''}`,
            ),
          );
        }
      });
      return out;
    }

    default:
      return [];
  }
}

export interface QueryPlanNode extends FlowNode {
  kind: PlanNode['kind'] | 'Root';
}

function visitNode(
  node: PlanNode,
  parentNode: Partial<QueryPlanNode>,
  nodes: QueryPlanNode[],
): void {
  const result: Partial<QueryPlanNode> = { id: uuidv4() };
  result.title = node.kind;
  result.kind = node.kind;

  switch (node.kind) {
    case 'Fetch':
      result.content = () => {
        return (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 overflow-hidden font-mono text-xs">
            <span className="font-medium">Service</span>
            <span className="text-secondary-foreground overflow-hidden text-ellipsis whitespace-nowrap">
              {node.serviceName}
            </span>
          </div>
        );
      };
      break;

    case 'BatchFetch':
      result.content = () => {
        return (
          <div className="*:border-border flex flex-col gap-2 *:border-b *:border-dashed *:pb-2 *:last:border-b-0 *:last:pb-0">
            {node.entityBatch.aliases.map(alias => {
              return (
                <div key={alias.alias}>
                  <span className="mb-2 font-mono text-xs font-bold">{alias.alias}</span>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2 overflow-hidden font-mono text-xs">
                    <span className="font-medium">Paths</span>
                    <span className="text-secondary-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                      <div className="bg-card rounded-sm border px-1">{alias.paths.length}</div>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      };
      break;

    case 'Flatten':
      result.content = () => {
        return (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 overflow-hidden font-mono text-xs">
            <span className="font-medium">Path</span>
            <span className="text-secondary-foreground overflow-hidden text-ellipsis whitespace-nowrap">
              {renderFlattenPath(node.path)}
            </span>
          </div>
        );
      };
      visitNode(node.node, result, nodes);
      break;

    case 'Sequence':
      for (const child of node.nodes) {
        visitNode(child, result, nodes);
      }
      break;

    case 'Parallel':
      for (const child of node.nodes) {
        visitNode(child, result, nodes);
      }
      break;

    case 'Condition':
      result.content = () => {
        return (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 overflow-hidden font-mono text-xs">
            <span className="font-medium">If</span>
            <span className="text-secondary-foreground overflow-hidden text-ellipsis whitespace-nowrap">
              ${node.condition}
            </span>
          </div>
        );
      };

      if (node.ifClause) {
        result.title = 'Include';
        visitNode(node.ifClause, result, nodes);
      }
      if (node.elseClause) {
        result.title = 'Skip';
        visitNode(node.elseClause, result, nodes);
      }
      break;

    case 'Subscription':
      visitNode(node.primary, result, nodes);
      break;

    case 'Defer':
      if (node.primary.node) {
        visitNode(node.primary.node, result, nodes);
      }
      for (const deferred of node.deferred) {
        if (deferred.node) {
          visitNode(deferred.node, result, nodes);
        }
      }
      break;

    default:
      break;
  }

  parentNode.next = [...(parentNode.next ?? []), result.id!];

  nodes.push(result as QueryPlanNode);
}

export const queryPlanNodeIcon = (
  kind: QueryPlanNode['kind'],
): ((props: LucideProps) => React.ReactNode) => {
  return (props: LucideProps) => {
    switch (kind) {
      case 'Root':
        return <GraphQLIcon {...props} />;
      case 'Fetch':
        return <Box {...props} />;
      case 'BatchFetch':
        return <Boxes {...props} />;
      case 'Flatten':
        return <Layers2Icon {...props} />;
      case 'Sequence':
        return <ListOrderedIcon {...props} />;
      case 'Parallel':
        return <NetworkIcon {...props} />;
      case 'Condition':
        return <GitForkIcon {...props} className={cn('rotate-90', props.className)} />;
      case 'Subscription':
        return <UnlinkIcon {...props} />;
      case 'Defer':
        return <ClockIcon {...props} />;
    }
  };
};

export function QueryPlanTree(props: { plan: QueryPlan }) {
  const nodes = useMemo(() => {
    const nodes: QueryPlanNode[] = [];

    const rootNode: QueryPlanNode = {
      id: uuidv4(),
      title: 'QueryPlan',
      kind: 'Root',
    };

    nodes.push(rootNode);

    if (props.plan.node) {
      visitNode(props.plan.node, rootNode, nodes);
    }

    return nodes.map(node => ({ ...node, icon: queryPlanNodeIcon(node.kind) }));
  }, [props.plan]);

  return <Flow nodes={nodes} />;
}
