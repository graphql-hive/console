import { useMemo, useState } from 'react';
import { parse, print } from 'graphql';
import { cn } from '@/lib/utils';
import * as dagre from '@dagrejs/dagre';

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

export type SelectionSet = {
  items?: SelectionItem[];
};

export type SelectionItem =
  | {
      kind?: 'Field';
      name: string;
      alias?: string | null;
      arguments?: Record<string, Value> | Array<[string, Value]> | null;
      selections?: SelectionSet | null;
      skipIf?: string | null;
      includeIf?: string | null;
    }
  | {
      kind?: 'InlineFragment';
      typeCondition?: string | null;
      selections?: SelectionSet | null;
    }
  | {
      kind?: 'FragmentSpread';
      name: string;
    }
  | Record<string, unknown>;

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
  requires?: SelectionSet | null;
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

/* ---------------------------------- */
/* helpers */
/* ---------------------------------- */

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

/* ---------------------------------- */
/* selection-set rendering */
/* ---------------------------------- */

function renderValue(value: Value): string {
  if (value === null) return 'null';

  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    return `[${value.map(renderValue).join(', ')}]`;
  }

  if (isObject(value)) {
    if (
      (value.kind === 'Variable' || 'variable' in value || 'name' in value) &&
      (value.variable || value.name)
    ) {
      return `$${String(value.variable ?? value.name)}`;
    }

    const entries = Object.entries(value);
    return `{ ${entries.map(([k, v]) => `${k}: ${renderValue(v as Value)}`).join(', ')} }`;
  }

  return String(value);
}

function renderArguments(
  args: Record<string, Value> | Array<[string, Value]> | null | undefined,
): string {
  if (!args) return '';

  const entries: Array<[string, Value]> = Array.isArray(args) ? args : Object.entries(args);
  if (entries.length === 0) return '';

  return `(${entries.map(([k, v]) => `${k}: ${renderValue(v)}`).join(', ')})`;
}

export function renderSelectionSet(
  selectionSet: SelectionSet | null | undefined,
  depth = 0,
): string {
  if (!selectionSet?.items?.length) return '';

  const lines: string[] = [];

  for (const item of selectionSet.items) {
    if (!isObject(item)) continue;

    if ((item as { kind?: string }).kind === 'Field') {
      const field = item as {
        name: string;
        alias?: string | null;
        arguments?: Record<string, Value> | Array<[string, Value]> | null;
        selections?: SelectionSet | null;
      };

      const alias = field.alias ? `${String(field.alias)}: ` : '';
      const args = renderArguments(
        (field.arguments as Record<string, Value> | Array<[string, Value]> | null | undefined) ??
          null,
      );
      const nested = renderSelectionSet(
        (field.selections as SelectionSet | null | undefined) ?? null,
        depth + 1,
      );

      if (nested) {
        lines.push(`${indent(depth)}${alias}${String(field.name)}${args} {`);
        lines.push(nested);
        lines.push(`${indent(depth)}}`);
      } else {
        lines.push(`${indent(depth)}${alias}${String(field.name)}${args}`);
      }

      continue;
    }

    if ('typeCondition' in item) {
      const nested = renderSelectionSet(
        (item.selections as SelectionSet | null | undefined) ?? null,
        depth + 1,
      );
      lines.push(`${indent(depth)}... on ${String(item.typeCondition ?? '')} {`);
      if (nested) lines.push(nested);
      lines.push(`${indent(depth)}}`);
      continue;
    }
  }

  return lines.join('\n');
}

/* ---------------------------------- */
/* plan pretty renderer */
/* ---------------------------------- */

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

  lines.push(`${indent(depth + 1)}operation:`);
  lines.push(renderMultilineBlock(print(parse(node.operation)), depth + 2));

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

  lines.push(`${indent(depth + 1)}operation:`);
  lines.push(renderMultilineBlock(print(parse(node.operation)), depth + 2));

  lines.push(`${indent(depth)}}`);
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

/* ---------------------------------- */
/* extracting graphql operations */
/* ---------------------------------- */

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

type VizNode = {
  id: string;
  label: string;
  subtitle?: string;
  details?: string[];
  width: number;
  height: number;
  x?: number;
  y?: number;
  kind: PlanNode['kind'] | 'Root';
};

type VizEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  points?: Array<{ x: number; y: number }>;
};

type BuildResult = {
  nodes: VizNode[];
  edges: VizEdge[];
  rootId?: string;
};

type LayoutedGraph = {
  nodes: VizNode[];
  edges: VizEdge[];
  width: number;
  height: number;
};

function layoutGraph(input: BuildResult): LayoutedGraph {
  const g = new dagre.graphlib.Graph();

  g.setGraph({
    rankdir: 'TB',
    nodesep: 80,
    ranksep: 80,
    marginx: 80,
    marginy: 80,
  });

  g.setDefaultEdgeLabel(() => ({}));

  console.log(input);

  for (const node of input.nodes) {
    g.setNode(node.id, {
      width: node.width,
      height: node.height,
    });
  }

  for (const edge of input.edges) {
    g.setEdge(edge.from, edge.to, {
      label: edge.label,
    });
  }

  dagre.layout(g);

  const nodes = input.nodes.map(node => {
    const p = g.node(node.id) as { x: number; y: number; width: number; height: number };
    return {
      ...node,
      x: p.x,
      y: p.y,
    };
  });

  const edges = input.edges.map(edge => {
    const e = g.edge(edge.from, edge.to) as { points?: Array<{ x: number; y: number }> };
    return {
      ...edge,
      points: e?.points ?? [],
    };
  });

  const graphInfo = g.graph() as {
    width?: number;
    height?: number;
  };

  return {
    nodes,
    edges,
    width: graphInfo.width ?? 800,
    height: graphInfo.height ?? 600,
  };
}

export type Point = {
  x: number;
  y: number;
};

export function orthogonalPoints(from: Point, to: Point, t = 0.5): [Point, Point, Point, Point] {
  const midY = from.y + (to.y - from.y) * t;

  return [from, { x: from.x, y: midY }, { x: to.x, y: midY }, to];
}

export function roundedOrthogonalPath(
  [p0, p1, p2, p3]: [Point, Point, Point, Point],
  radius = 12,
): string {
  const r1 = Math.min(radius, Math.abs(p1.y - p0.y), Math.abs(p2.x - p1.x));
  const r2 = Math.min(radius, Math.abs(p2.x - p1.x), Math.abs(p3.y - p2.y));

  const p1a = {
    x: p1.x,
    y: p1.y - Math.sign(p1.y - p0.y) * r1,
  };

  const p1b = {
    x: p1.x + Math.sign(p2.x - p1.x) * r1,
    y: p1.y,
  };

  const p2a = {
    x: p2.x - Math.sign(p2.x - p1.x) * r2,
    y: p2.y,
  };

  const p2b = {
    x: p2.x,
    y: p2.y + Math.sign(p3.y - p2.y) * r2,
  };

  return [
    `M ${p0.x} ${p0.y}`,
    `L ${p1a.x} ${p1a.y}`,
    `Q ${p1.x} ${p1.y} ${p1b.x} ${p1b.y}`,
    `L ${p2a.x} ${p2a.y}`,
    `Q ${p2.x} ${p2.y} ${p2b.x} ${p2b.y}`,
    `L ${p3.x} ${p3.y}`,
  ].join(' ');
}

function makeNode(id: string, kind: VizNode['kind'], label: string): VizNode {
  const { width, height } = { width: 160, height: 40 };
  return { id, kind, label, width, height };
}

function visitNode(
  node: PlanNode,
  nextId: () => string,
  nodes: VizNode[],
  edges: VizEdge[],
): string {
  switch (node.kind) {
    case 'Fetch': {
      const id = nextId();
      nodes.push(makeNode(id, 'Fetch', `Fetch → ${node.serviceName}`));
      return id;
    }

    case 'BatchFetch': {
      const id = nextId();
      // const aliasSummary = node.entityBatch.aliases.map(a => `alias: ${a.alias}`);
      nodes.push(makeNode(id, 'BatchFetch', `BatchFetch → ${node.serviceName}`));
      return id;
    }

    case 'Flatten': {
      const id = nextId();
      nodes.push(makeNode(id, 'Flatten', 'Flatten'));
      const childId = visitNode(node.node, nextId, nodes, edges);
      edges.push({ id: `e_${id}_${childId}`, from: id, to: childId });
      return id;
    }

    case 'Sequence': {
      const id = nextId();
      nodes.push(makeNode(id, 'Sequence', 'Sequence'));

      node.nodes.forEach((child, index) => {
        const childId = visitNode(child, nextId, nodes, edges);
        edges.push({
          id: `e_${id}_${childId}`,
          from: id,
          to: childId,
          label: String(index + 1),
        });
      });

      return id;
    }

    case 'Parallel': {
      const id = nextId();
      nodes.push(makeNode(id, 'Parallel', 'Parallel'));

      node.nodes.forEach((child, index) => {
        const childId = visitNode(child, nextId, nodes, edges);
        edges.push({
          id: `e_${id}_${childId}`,
          from: id,
          to: childId,
          label: `P${index + 1}`,
        });
      });

      return id;
    }

    case 'Condition': {
      const id = nextId();
      nodes.push(makeNode(id, 'Condition', 'Condition'));

      if (node.ifClause) {
        const ifId = visitNode(node.ifClause, nextId, nodes, edges);
        edges.push({ id: `e_${id}_${ifId}`, from: id, to: ifId, label: 'if' });
      }

      if (node.elseClause) {
        const elseId = visitNode(node.elseClause, nextId, nodes, edges);
        edges.push({ id: `e_${id}_${elseId}`, from: id, to: elseId, label: 'else' });
      }

      return id;
    }

    case 'Subscription': {
      const id = nextId();
      nodes.push(makeNode(id, 'Subscription', 'Subscription'));
      const childId = visitNode(node.primary, nextId, nodes, edges);
      edges.push({ id: `e_${id}_${childId}`, from: id, to: childId, label: 'primary' });
      return id;
    }

    case 'Defer': {
      const id = nextId();
      nodes.push(makeNode(id, 'Defer', 'Defer'));

      if (node.primary.node) {
        const primaryId = visitNode(node.primary.node, nextId, nodes, edges);
        edges.push({
          id: `e_${id}_${primaryId}`,
          from: id,
          to: primaryId,
          label: 'primary',
        });
      }

      node.deferred.forEach((part, index) => {
        if (!part.node) return;
        const childId = visitNode(part.node, nextId, nodes, edges);
        edges.push({
          id: `e_${id}_${childId}`,
          from: id,
          to: childId,
          label: part.label ?? `deferred ${index + 1}`,
        });
      });

      return id;
    }

    default: {
      const id = nextId();
      nodes.push(makeNode(id, 'Root', 'Unknown'));
      return id;
    }
  }
}

function buildPlanGraph(plan: QueryPlan): BuildResult {
  const nodes: VizNode[] = [];
  const edges: VizEdge[] = [];
  let seq = 0;

  const nextId = () => `n_${seq++}`;

  const rootId = nextId();

  nodes.push(makeNode(rootId, 'Root', 'QueryPlan'));

  if (!plan.node) {
    const emptyId = nextId();
    nodes.push(makeNode(emptyId, 'Root', 'Empty'));
    edges.push({ id: `e_${rootId}_${emptyId}`, from: rootId, to: emptyId });
    return { nodes, edges, rootId };
  }

  const childId = visitNode(plan.node, nextId, nodes, edges);
  edges.push({ id: `e_${rootId}_${childId}`, from: rootId, to: childId });

  return { nodes, edges, rootId };
}

export function QueryPlanTree(props: { plan: QueryPlan }) {
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);

  const g = useMemo(() => {
    const built = buildPlanGraph(props.plan);

    return layoutGraph(built);
  }, [props.plan]);

  const nodesFollowingHoveredNode = useMemo(() => {
    if (!hoverNodeId) {
      return [];
    }

    const outgoing = new Map<string, string[]>();
    for (const edge of g.edges) {
      const existing = outgoing.get(edge.from);
      if (existing) {
        existing.push(edge.to);
      } else {
        outgoing.set(edge.from, [edge.to]);
      }
    }

    // All nodes reachable by repeatedly following `from -> to` edges.
    const visited = new Set<string>();
    const queue: string[] = [hoverNodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const next = outgoing.get(current);
      if (!next) continue;

      for (const id of next) {
        if (visited.has(id)) continue;
        visited.add(id);
        queue.push(id);
      }
    }

    return g.nodes.filter(node => visited.has(node.id));
  }, [g.nodes, g.edges, hoverNodeId]);

  const nodesFollowingHoveredNodeIds = useMemo(() => {
    return new Set(nodesFollowingHoveredNode.map(n => n.id));
  }, [nodesFollowingHoveredNode]);

  return (
    <div className="bg-background relative h-full w-full overflow-auto">
      <svg className="absolute left-[80px] top-[20px]" width={g.width} height={g.height}>
        {g.edges.map(edge => {
          const from = g.nodes.find(node => node.id === edge.from)!;
          const to = g.nodes.find(node => node.id === edge.to)!;
          const isEdgeFollowingHovered =
            !!hoverNodeId &&
            (edge.from === hoverNodeId || nodesFollowingHoveredNodeIds.has(edge.from)) &&
            nodesFollowingHoveredNodeIds.has(edge.to);

          return (
            <path
              key={edge.id}
              className={cn(
                'fill-none transition-all',
                isEdgeFollowingHovered ? 'stroke-primary' : 'stroke-border',
              )}
              d={roundedOrthogonalPath(
                orthogonalPoints(
                  { x: from.x!, y: from.y! + from.height! / 2 },
                  { x: to.x!, y: to.y! - to.height! / 2 },
                ),
                12,
              )}
              strokeWidth={isEdgeFollowingHovered ? '2' : '1'}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {g.nodes.map(node => {
        const isHovered = hoverNodeId === node.id;
        const isFollowingHovered = !!hoverNodeId && nodesFollowingHoveredNodeIds.has(node.id);

        return (
          <div
            key={node.id}
            className={cn(
              'bg-card absolute z-10 flex items-center justify-center rounded-md border text-sm transition-all',
              (isHovered || isFollowingHovered) && 'border-primary ring-primary ring-1',
              isHovered && 'ring-primary ring-2',
            )}
            style={{
              width: node.width,
              height: node.height,
              left: node.x,
              top: node.y,
            }}
            onMouseEnter={() => setHoverNodeId(node.id)}
            onMouseLeave={() => setHoverNodeId(null)}
          >
            {node.label}
          </div>
        );
      })}
    </div>
  );
}
