import { useMemo } from 'react';
import { parse, print } from 'graphql';
import { isArray } from 'lodash';
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
import { Editor } from '@/components/laboratory/editor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  BatchFetchNodePlan,
  ConditionNodePlan,
  DeferNodePlan,
  FetchNodePlan,
  FlattenNodePath,
  FlattenNodePathSegment,
  FlattenNodePlan,
  ParallelNodePlan,
  PlanNode,
  QueryPlan,
  SelectionInlineFragment,
  SelectionSet,
  SequenceNodePlan,
  SubscriptionNodePlan,
} from './schema';

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

  if (isArray(seg)) {
    return renderFlattenPath(seg);
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
  selectionSet: SelectionSet | null | undefined,
  depth = 0,
): string {
  if (!selectionSet?.length) return '';

  const lines: string[] = [];

  for (const item of selectionSet) {
    if (item.kind === 'InlineFragment') {
      lines.push(`${indent(depth)}... on ${item.typeCondition} {`);

      for (const property of item.selections ?? []) {
        lines.push(`${indent(depth + 1)}${property.name}`);
      }

      lines.push(`${indent(depth)}}`);
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
    lines.push(`${indent(depth + 1)}{`);
    const requires = renderSelectionSet(node.requires, depth + 2);
    if (requires) lines.push(requires);
    lines.push(`${indent(depth + 1)}} =>`);
  }

  const slice = node.operation.includes('_entities') ? 2 : 1;

  try {
    lines.push(
      `${indent(depth + 1)}{`,
      renderMultilineBlock(
        print(parse(node.operation))
          .split('\n')
          .slice(slice, slice * -1)
          .join('\n'),
        depth + 2 - slice,
      ),
      `${indent(depth + 1)}}`,
    );
  } catch {
    lines.push(`${indent(depth + 1)}${node.operation}`);
  }

  lines.push(`${indent(depth)}}`);

  return lines.join('\n');
}

export function renderBatchFetchNode(node: BatchFetchNodePlan, depth = 0): string {
  const lines: string[] = [];
  lines.push(`${indent(depth)}BatchFetch(service: "${node.serviceName}") {`);

  for (let i = 0; i < node.entityBatch.aliases.length; i++) {
    const alias = node.entityBatch.aliases[i];

    lines.push(
      `${indent(depth + 1)}${alias.alias} {`,
      `${indent(depth + 2)}paths: [`,
      ...alias.paths.map(path => `${indent(depth + 3)}"${renderFlattenPath(path)}"`),
      `${indent(depth + 2)}]`,
    );

    const requires = renderSelectionSet(alias.requires, depth + 3);

    if (requires) {
      lines.push(`${indent(depth + 2)}{`, requires, `${indent(depth + 2)}}`);
    }

    if (i < node.entityBatch.aliases.length - 1) {
      lines.push(`${indent(depth + 1)}}`);
    }
  }

  try {
    lines.push(
      `${indent(depth + 1)}}`,
      `${indent(depth + 1)}{`,
      renderMultilineBlock(
        print(parse(node.operation)).split('\n').slice(1, -1).join('\n'),
        depth + 1,
      ),
      `${indent(depth + 1)}}`,
      `${indent(depth)}}`,
    );
  } catch {
    lines.push(`${indent(depth + 1)}${node.operation}`);
  }

  return lines.join('\n');
}

export function renderFlattenNode(node: FlattenNodePlan, depth = 0): string {
  const lines: string[] = [];
  lines.push(
    `${indent(depth)}Flatten(path: "${renderFlattenPath(node.path)}") {`,
    renderPlanNode(node.node, depth + 1),
    `${indent(depth)}}`,
  );
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
    lines.push(
      `${indent(depth)}Include(if: $${node.condition}) {`,
      renderPlanNode(node.ifClause, depth + 1),
      `${indent(depth)}}`,
    );
    return lines.join('\n');
  }

  if (!node.ifClause && node.elseClause) {
    lines.push(
      `${indent(depth)}Skip(if: $${node.condition}) {`,
      renderPlanNode(node.elseClause, depth + 1),
      `${indent(depth)}}`,
    );
    return lines.join('\n');
  }

  if (node.ifClause && node.elseClause) {
    lines.push(
      `${indent(depth)}Condition(if: $${node.condition}) {`,
      `${indent(depth + 1)}if {`,
      renderPlanNode(node.ifClause, depth + 2),
      `${indent(depth + 1)}}`,
      `${indent(depth + 1)}else {`,
      renderPlanNode(node.elseClause, depth + 2),
      `${indent(depth + 1)}}`,
      `${indent(depth)}}`,
    );
    return lines.join('\n');
  }

  return `${indent(depth)}Condition(if: $${node.condition}) {}`;
}

export function renderSubscriptionNode(node: SubscriptionNodePlan, depth = 0): string {
  const lines: string[] = [];
  lines.push(
    `${indent(depth)}Subscription {`,
    `${indent(depth + 1)}primary {`,
    renderPlanNode(node.primary, depth + 2),
    `${indent(depth + 1)}}`,
    `${indent(depth)}}`,
  );
  return lines.join('\n');
}

export function renderDeferNode(node: DeferNodePlan, depth = 0): string {
  const lines: string[] = [];
  lines.push(`${indent(depth)}Defer {`, `${indent(depth + 1)}primary {`);
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
  children?: QueryPlanNode[];
}

function visitNode(
  node: PlanNode,
  parentNode: QueryPlanNode | null,
  nodes: QueryPlanNode[],
  contentPrefix?: React.ReactNode,
  detailsContent?: string,
): QueryPlanNode {
  let result: QueryPlanNode | null = {
    id: uuidv4(),
    title: node.kind,
    kind: node.kind as QueryPlanNode['kind'],
  };

  switch (node.kind) {
    case 'Fetch':
      result.content = () => {
        const entity = (node.requires?.[0] as SelectionInlineFragment)?.typeCondition;
        return (
          <div className="flex flex-col gap-2">
            {contentPrefix}
            <div className="grid grid-cols-[1fr_auto] items-center gap-8 overflow-hidden font-mono text-xs">
              <span className="font-medium">Service</span>
              <span className="text-secondary-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                {node.serviceName}
              </span>
            </div>
            {entity && (
              <div className="grid grid-cols-[1fr_auto] items-center gap-8 overflow-hidden font-mono text-xs">
                <span className="font-medium">Entity</span>
                <span className="text-secondary-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                  {entity}
                </span>
              </div>
            )}
            <div className="border-t border-dashed">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="link" className="h-auto w-full pt-2 text-xs">
                    Show details
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl! max-h-150 h-full w-full">
                  <DialogHeader>
                    <DialogTitle>Fetch</DialogTitle>
                  </DialogHeader>
                  <div className="h-full overflow-hidden rounded-sm border">
                    <Editor value={detailsContent ?? renderFetchNode(node)} language="graphql" />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        );
      };
      break;

    case 'BatchFetch':
      result.headerSuffix = () => {
        const totalPaths = node.entityBatch.aliases.reduce(
          (acc, alias) => acc + alias.paths.length,
          0,
        );

        return (
          <div className="bg-muted flex items-center gap-1 rounded-md p-0.5 pl-1 font-mono text-xs leading-none">
            Total paths:
            <div className="bg-primary/10 border-primary text-primary rounded-sm border px-1 text-xs font-medium leading-none">
              {totalPaths}
            </div>
          </div>
        );
      };
      result.content = () => {
        return (
          <div className="*:border-border flex flex-col gap-2 *:border-b *:border-dashed *:pb-2 *:last:border-b-0 *:last:pb-0">
            <div className="grid grid-cols-[1fr_auto] items-center gap-8 overflow-hidden font-mono text-xs">
              <span className="font-medium">Service</span>
              <span className="text-secondary-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                {node.serviceName}
              </span>
            </div>
            {node.entityBatch.aliases.map(alias => {
              return (
                <div key={alias.alias} className="grid gap-2">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-8 overflow-hidden font-mono text-xs">
                    <span className="font-medium">Path</span>
                    {alias.paths.length > 1 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-secondary-foreground cursor-auto overflow-hidden text-ellipsis whitespace-nowrap">
                            <div className="bg-card rounded-sm border px-1 text-xs font-medium">
                              {alias.paths.length}
                            </div>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="whitespace-pre-wrap font-mono">
                          {alias.paths.map(path => renderFlattenPath(path)).join(',\n')}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-secondary-foreground cursor-auto overflow-hidden text-ellipsis whitespace-nowrap">
                            {renderFlattenPath(alias.paths[0])}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{renderFlattenPath(alias.paths[0])}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-8 overflow-hidden font-mono text-xs">
                    <span className="font-medium">Enitity</span>
                    <span className="text-secondary-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                      {(alias.requires[0] as SelectionInlineFragment).typeCondition}
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="-mt-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="link" className="h-auto w-full pt-2 text-xs">
                    Show details
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="max-w-2xl! max-h-150 h-full w-full"
                  onMouseDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>BatchFetch</DialogTitle>
                  </DialogHeader>
                  <div className="h-full overflow-hidden rounded-sm border">
                    <Editor value={renderBatchFetchNode(node)} language="graphql" />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        );
      };

      break;

    case 'Flatten':
      result = visitNode(
        node.node,
        result,
        nodes,
        <>
          {contentPrefix}
          <div className="grid grid-cols-[1fr_auto] items-center gap-8 overflow-hidden font-mono text-xs">
            <span className="font-medium">Path</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-secondary-foreground cursor-auto overflow-hidden text-ellipsis whitespace-nowrap">
                  {renderFlattenPath(node.path)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{renderFlattenPath(node.path)}</TooltipContent>
            </Tooltip>
          </div>
        </>,
        detailsContent ?? renderFlattenNode(node),
      );
      break;

    case 'Sequence': {
      result = null;

      let prevChild: QueryPlanNode | null = null;

      for (let i = 0; i < node.nodes.length; i++) {
        const child = node.nodes[i];

        const childNode = visitNode(
          child,
          prevChild,
          i === 0 ? [] : nodes,
          contentPrefix,
          detailsContent,
        );

        if (i === 0) {
          result = childNode;
        }

        if (prevChild) {
          prevChild.next = [childNode.id];
        }

        prevChild = childNode;
      }

      break;
    }

    case 'Parallel':
      result.children = [];

      for (const child of node.nodes) {
        visitNode(child, result, result.children, contentPrefix, detailsContent);
      }

      break;

    case 'Condition':
      if (node.ifClause) {
        result = visitNode(
          node.ifClause,
          result,
          nodes,
          <div className="grid grid-cols-[1fr_auto] items-center gap-8 overflow-hidden font-mono text-xs">
            <span className="font-medium">Include</span>
            <span className="text-secondary-foreground overflow-hidden text-ellipsis whitespace-nowrap">
              if: ${node.condition}
            </span>
          </div>,
          renderConditionNode(node),
        );
      } else if (node.elseClause) {
        result = visitNode(
          node.elseClause,
          result,
          nodes,
          <div className="grid grid-cols-[1fr_auto] items-center gap-8 overflow-hidden font-mono text-xs">
            <span className="font-medium">Skip</span>
            <span className="text-secondary-foreground overflow-hidden text-ellipsis whitespace-nowrap">
              if: ${node.condition}
            </span>
          </div>,
          renderConditionNode(node),
        );
      }
      break;

    case 'Subscription':
      visitNode(node.primary, result, nodes, contentPrefix, detailsContent);
      break;

    case 'Defer':
      if (node.primary.node) {
        visitNode(node.primary.node, result, nodes, contentPrefix, detailsContent);
      }
      for (const deferred of node.deferred) {
        if (deferred.node) {
          visitNode(deferred.node, result, nodes, contentPrefix, detailsContent);
        }
      }
      break;

    default:
      break;
  }

  if (parentNode && result) {
    parentNode.next = [...(parentNode.next ?? []), result.id!];
  }

  if (result) {
    result.icon = queryPlanNodeIcon(result.kind);
    nodes.push(result as QueryPlanNode);
  }

  return result as QueryPlanNode;
}

export const queryPlanNodeIcon = (
  kind: QueryPlanNode['kind'],
): ((props: LucideProps) => React.ReactNode) => {
  return (props: LucideProps) => {
    switch (kind) {
      case 'Root':
        return (
          <GraphQLIcon {...props} className={cn(props.className, 'size-6 min-w-6 text-pink-500')} />
        );
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
      title: '',
      kind: 'Root',
      maxWidth: 42,
    };

    nodes.push(rootNode);

    if (props.plan.node) {
      visitNode(props.plan.node, rootNode, nodes);
    }

    return nodes.map(node => {
      return {
        ...node,
        icon: queryPlanNodeIcon(node.kind),
      } satisfies FlowNode;
    });
  }, [props.plan]);

  return <Flow nodes={nodes} />;
}
