import { useCallback, useMemo, useState } from 'react';
import { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';
import dagre from '@dagrejs/dagre';

export interface FlowNode {
  id: string;
  title: string;
  next?: string[];
  icon?: (props: LucideProps) => React.ReactNode;
  content?: (props: { node: FlowNode }) => React.ReactNode;
}

export interface FlowGraphInternal extends FlowNode {
  x: number;
  y: number;
  width: number;
  height: number;
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

export const Flow = (props: { nodes: FlowNode[] }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [nodes, edges, graphSize] = useMemo(() => {
    if (Object.keys(nodeSizes).length === 0) {
      return [
        props.nodes.map(node => ({ ...node, x: 0, y: 0, width: 0, height: 0 })),
        [],
        { width: 0, height: 0 },
      ];
    }

    const graph = new dagre.graphlib.Graph();

    graph.setDefaultEdgeLabel(() => ({}));

    graph.setGraph({
      rankdir: 'TB',
      nodesep: 36,
      ranksep: 36,
      marginx: 24,
      marginy: 24,
      graph: 'tight-tree',
    });

    for (const node of props.nodes) {
      graph.setNode(node.id, {
        width: nodeSizes[node.id]?.width ?? 100,
        height: nodeSizes[node.id]?.height ?? 100,
      });
    }

    for (const node of props.nodes) {
      if (node.next) {
        for (const next of node.next) {
          graph.setEdge(node.id, next);
        }
      }
    }

    dagre.layout(graph);

    return [
      props.nodes.map(node => {
        const graphNode = graph.node(node.id);

        return {
          ...node,
          x: graphNode?.x ?? 0,
          y: graphNode?.y ?? 0,
          width: graphNode?.width ?? 0,
          height: graphNode?.height ?? 0,
        };
      }),
      graph.edges().map(edge => {
        return {
          from: edge.v,
          to: edge.w,
        };
      }),
      { width: graph.graph().width, height: graph.graph().height },
    ];
  }, [nodeSizes, props.nodes]);

  const findFollowers = useCallback(
    (nodeId: string): FlowNode[] => {
      const node = nodes.find(node => node.id === nodeId);

      if (!node) {
        return [] as FlowNode[];
      }

      return (
        (node.next
          ?.map(next => {
            return [nodes.find(node => node.id === next), ...findFollowers(next)].filter(Boolean);
          })
          .flat(Infinity) as FlowNode[]) ?? []
      );
    },
    [nodes],
  );

  const hoveredNodeFollowers = useMemo(() => {
    if (!hoveredNodeId) {
      return [];
    }

    return findFollowers(hoveredNodeId);
  }, [hoveredNodeId, findFollowers]);

  return (
    <div className="bg-background size-full">
      <div className="relative size-full overflow-auto">
        <div
          className={cn(
            'absolute left-0 top-0 opacity-50 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:20px_20px]',
          )}
          style={{ width: graphSize.width, height: graphSize.height }}
        />
        <svg
          className="absolute left-0 top-0"
          style={{ width: graphSize.width, height: graphSize.height }}
        >
          {edges.map(edge => {
            const fromNode = nodes.find(node => node.id === edge.from);
            const toNode = nodes.find(node => node.id === edge.to);

            if (!fromNode || !toNode) {
              return null;
            }

            const isHovered = hoveredNodeId === edge.from;
            const isFollowingHoveredNode = hoveredNodeFollowers.some(
              follower => follower.id === edge.from,
            );

            return (
              <path
                key={edge.from + edge.to}
                className={cn('stroke-border fill-none stroke-2 transition-all', {
                  'stroke-primary': isHovered || isFollowingHoveredNode,
                })}
                d={roundedOrthogonalPath(
                  orthogonalPoints(
                    {
                      x: fromNode.x + fromNode.width / 2,
                      y: fromNode.y + fromNode.height / 2,
                    },
                    {
                      x: toNode.x + toNode.width / 2,
                      y: toNode.y + toNode.height / 2,
                    },
                  ),
                  12,
                )}
              />
            );
          })}
        </svg>
        {nodes.map(node => {
          const isHovered = hoveredNodeId === node.id;
          const isFollowingHoveredNode = hoveredNodeFollowers.some(
            follower => follower.id === node.id,
          );
          const hasFollowers = !!node.next?.length;
          const hasPrevious = nodes.some(n => n.next?.includes(node.id));

          return (
            <div
              key={node.id}
              ref={ref => {
                if (ref && !nodeSizes[node.id]) {
                  setNodeSizes(prev => ({
                    ...prev,
                    [node.id]: { width: ref.clientWidth, height: ref.clientHeight },
                  }));
                }
              }}
              className={cn(
                'bg-card absolute flex w-64 flex-col justify-start gap-2 rounded-lg border p-2 text-sm shadow-sm transition-all',
                {
                  'border-primary shadow-primary/5 shadow-xl': isHovered || isFollowingHoveredNode,
                },
              )}
              style={{
                left: node.x,
                top: node.y,
              }}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              <div className="flex items-center gap-2">
                {node.icon ? node.icon({ className: 'size-4 text-secondary-foreground' }) : null}
                <span className="font-medium">{node.title}</span>
              </div>
              <div className="bg-secondary w-full rounded-sm p-2 empty:hidden">
                {node.content ? node.content({ node }) : null}
              </div>
              {hasFollowers && (
                <div
                  className={cn(
                    '-translate-x-1.25 border-border bg-background absolute bottom-0 left-1/2 size-2 translate-y-1/2 rounded-full border-2 transition-all',
                    {
                      'bg-primary': isHovered || isFollowingHoveredNode,
                    },
                  )}
                />
              )}
              {hasPrevious && (
                <div
                  className={cn(
                    '-translate-x-1.25 border-border bg-background absolute left-1/2 top-0 size-2 -translate-y-1/2 rounded-full border-2 transition-all',
                    {
                      'bg-primary': isFollowingHoveredNode,
                    },
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
