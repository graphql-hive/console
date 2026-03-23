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
  parent?: string;
}

export interface FlowGraphInternal extends FlowNode {
  x: number;
  y: number;
  width: number;
  height: number;
  isCluster: boolean;
}

export type Point = {
  x: number;
  y: number;
};

export function orthogonalPoints(from: Point, to: Point, t = 0.5): [Point, Point, Point, Point] {
  const midX = from.x + (to.x - from.x) * t;

  return [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to];
}

export function roundedOrthogonalPath(
  [p0, p1, p2, p3]: [Point, Point, Point, Point],
  radius = 12,
): string {
  const r1 = Math.min(radius, Math.abs(p1.x - p0.x), Math.abs(p2.y - p1.y));
  const r2 = Math.min(radius, Math.abs(p2.y - p1.y), Math.abs(p3.x - p2.x));

  const p1a = {
    x: p1.x - Math.sign(p1.x - p0.x) * r1,
    y: p1.y,
  };

  const p1b = {
    x: p1.x,
    y: p1.y + Math.sign(p2.y - p1.y) * r1,
  };

  const p2a = {
    x: p2.x,
    y: p2.y - Math.sign(p2.y - p1.y) * r2,
  };

  const p2b = {
    x: p2.x + Math.sign(p3.x - p2.x) * r2,
    y: p2.y,
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

export const Flow = (props: { nodes: FlowNode[]; graph?: Record<string, any> }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [nodes, edges, graphSize] = useMemo(() => {
    if (Object.keys(nodeSizes).length === 0) {
      return [
        props.nodes.map(node => ({ ...node, x: 0, y: 0, width: 0, height: 0, isCluster: false })),
        [],
        { width: 0, height: 0 },
      ];
    }

    const result = new dagre.graphlib.Graph({
      compound: true,
    })
      .setGraph({
        rankdir: 'LR',
        align: 'UL',
        nodesep: 32,
        ranksep: 32,
        marginx: 32,
        marginy: 32,
        graph: 'tight-tree',
      })
      .setDefaultEdgeLabel(() => ({}));

    const groups = [...new Set(props.nodes.map(node => node.parent))].filter(Boolean);

    for (const node of props.nodes) {
      if (!groups.includes(node.id)) {
        result.setNode(node.id, {
          width: nodeSizes[node.id]?.width,
          height: nodeSizes[node.id]?.height,
        });
      }
    }

    for (const group of groups) {
      result.setNode(group!, {
        // clusterLabelPos: group!,
      });
    }

    for (const node of props.nodes) {
      if (node.parent) {
        result.setParent(node.id, node.parent);
      }
    }

    for (const node of props.nodes) {
      if (node.next) {
        for (const next of node.next) {
          if (groups.includes(next)) {
            const nextNode = props.nodes.find(node => node.id === next);

            for (const childNext of nextNode?.next ?? []) {
              result.setEdge(node.id, childNext);
            }
          } else if (!groups.includes(node.id)) {
            result.setEdge(node.id, next);
          }
        }
      }
    }

    dagre.layout(result);

    const graph = result.graph();

    return [
      props.nodes.map(node => {
        const graphNode = result.node(node.id);

        return {
          ...node,
          isCluster: groups.includes(node.id),
          x: graphNode?.x ?? 0,
          y: graphNode?.y ?? 0,
          width: graphNode?.width ?? 0,
          height: graphNode?.height ?? 0,
        };
      }),
      result.edges().map(edge => {
        return {
          from: edge.v,
          to: edge.w,
        };
      }),
      { width: graph.width, height: graph.height },
    ];
  }, [nodeSizes, props.nodes, props.graph]);

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
    <div className={cn('bg-background relative size-full')}>
      <div className="absolute inset-0 h-full w-full bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] bg-size-[16px_16px] opacity-50" />
      <div className={cn('relative size-full overflow-auto')}>
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
                'bg-card absolute z-20 flex w-64 flex-col justify-start gap-2 rounded-lg border p-2 text-sm shadow-sm transition-all',
                {
                  'border-primary shadow-primary/5 shadow-xl':
                    (isHovered || isFollowingHoveredNode) && !node.isCluster,
                  'bg-card/50 pointer-events-none z-10 -mt-[10px] w-auto rounded-2xl border-dashed':
                    node.isCluster,
                },
              )}
              style={{
                left: node.x - node.width / 2,
                top: node.y - node.height / 2,
                width: node.isCluster ? node.width : undefined,
                height: node.isCluster ? node.height : undefined,
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
              {hasFollowers && !node.isCluster && (
                <div
                  className={cn(
                    'border-border bg-background absolute top-1/2 left-full size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all',
                    {
                      'bg-primary': isHovered || isFollowingHoveredNode,
                    },
                  )}
                />
              )}
              {hasPrevious && !node.isCluster && (
                <div
                  className={cn(
                    'border-border bg-background absolute top-1/2 left-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all',
                    {
                      'bg-primary': isFollowingHoveredNode,
                    },
                  )}
                />
              )}
            </div>
          );
        })}
        <svg
          className="pointer-events-none absolute top-0 left-0 z-10"
          style={{ width: graphSize.width, height: graphSize.height }}
        >
          {edges
            .sort((a, b) => {
              const isHoveredA = hoveredNodeId === a.from;
              const isHoveredB = hoveredNodeId === b.from;
              const isFollowingHoveredNodeA = hoveredNodeFollowers.some(
                follower => follower.id === a.from,
              );
              const isFollowingHoveredNodeB = hoveredNodeFollowers.some(
                follower => follower.id === b.from,
              );

              if (
                (isHoveredA || isFollowingHoveredNodeA) &&
                (!isHoveredB || !isFollowingHoveredNodeB)
              ) {
                return 1;
              }

              if (
                (!isHoveredA || !isFollowingHoveredNodeA) &&
                (isHoveredB || isFollowingHoveredNodeB)
              ) {
                return -1;
              }

              return 0;
            })
            .filter(Boolean)
            .map(edge => {
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
                        y: fromNode.y,
                      },
                      {
                        x: toNode.x - toNode.width / 2,
                        y: toNode.y,
                      },
                    ),
                    4,
                  )}
                />
              );
            })}
        </svg>
      </div>
    </div>
  );
};
