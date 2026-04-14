import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState, WheelEvent } from 'react';
import { LucideProps, MaximizeIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import dagre from '@dagrejs/dagre';

export interface FlowNode {
  id: string;
  title: string;
  next?: string[];
  icon?: (props: LucideProps) => React.ReactNode;
  content?: (props: { node: FlowNode }) => React.ReactNode;
  headerSuffix?: (props: { node: FlowNode }) => React.ReactNode;
  children?: FlowNode[];
  maxWidth?: number;
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

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.02;

export const Flow = (props: {
  nodes: FlowNode[];
  margin?: number;
  gapX?: number;
  gapY?: number;
  onGraphLayout?: (graph: dagre.graphlib.Graph) => void;
  disableBackground?: boolean;
  disableGestures?: boolean;
  className?: string;
  containerClassName?: string;
  isChild?: boolean;
}) => {
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<Point | null>(null);
  const [view, setView] = useState<{ x: number; y: number; scale: number }>({
    x: 0,
    y: 0,
    scale: 1,
  });
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
        ranksep: props.gapX ?? 48,
        nodesep: props.gapY ?? 48,
        marginx: props.margin ?? 32,
        marginy: props.margin ?? 64,
        graph: 'tight-tree',
      })
      .setDefaultEdgeLabel(() => ({}));

    for (const node of props.nodes) {
      result.setNode(node.id, {
        width: nodeSizes[node.id]?.width,
        height: nodeSizes[node.id]?.height,
      });
    }

    for (const node of props.nodes) {
      if (node.next) {
        for (const next of node.next) {
          result.setEdge(node.id, next);
        }
      }
    }

    dagre.layout(result);

    props.onGraphLayout?.(result);

    const graph = result.graph();

    return [
      props.nodes.map(node => {
        const graphNode = result.node(node.id);

        return {
          ...node,
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
  }, [nodeSizes, props.nodes, props.margin, props.gapX]);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (props.disableGestures) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        const bounds = event.currentTarget.getBoundingClientRect();
        const pointerX = event.clientX - bounds.left;
        const pointerY = event.clientY - bounds.top;

        setView(prev => {
          const zoomFactor = Math.exp(-event.deltaY * ZOOM_STEP);
          const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * zoomFactor));
          const ratio = scale / prev.scale;
          const x = pointerX - (pointerX - prev.x) * ratio;
          const y = pointerY - (pointerY - prev.y) * ratio;

          return { x, y, scale };
        });

        return;
      }
    },
    [props.disableGestures],
  );

  const stopPanning = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) {
        return;
      }

      if (!event.nativeEvent.composedPath().includes(containerRef.current)) {
        return;
      }

      if (props.disableGestures) {
        return;
      }

      event.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: event.clientX, y: event.clientY };

      function handleMouseUp() {
        stopPanning();
        setIsCanvasActive(false);
      }

      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    },
    [props.disableGestures],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (props.disableGestures || !isPanning || !panStartRef.current) {
        return;
      }

      const deltaX = event.clientX - panStartRef.current.x;
      const deltaY = event.clientY - panStartRef.current.y;
      panStartRef.current = { x: event.clientX, y: event.clientY };

      setView(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
    },
    [isPanning, props.disableGestures],
  );

  const fitInView = useCallback(() => {
    const { width, height } = graphSize;
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();

    console.log({
      container,
      containerWidth,
      containerHeight,
      width,
      height,
    });

    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min(containerWidth / width, containerHeight / height)),
    );

    setView(prev => ({
      ...prev,
      scale,
      x: containerWidth / 2 - (width * scale) / 2,
      y: containerHeight / 2 - (height * scale) / 2,
    }));
  }, [graphSize]);

  useEffect(() => {
    if (props.disableGestures || !containerRef.current) {
      return;
    }

    const element = containerRef.current;

    const preventNativeGesture = (event: Event) => {
      event.preventDefault();
    };

    element.addEventListener('gesturestart', preventNativeGesture, { passive: false });
    element.addEventListener('gesturechange', preventNativeGesture, { passive: false });
    element.addEventListener('gestureend', preventNativeGesture, { passive: false });
    element.addEventListener('wheel', preventNativeGesture, { passive: false });

    return () => {
      element.removeEventListener('gesturestart', preventNativeGesture);
      element.removeEventListener('gesturechange', preventNativeGesture);
      element.removeEventListener('gestureend', preventNativeGesture);
      element.removeEventListener('wheel', preventNativeGesture);
    };
  }, [props.disableGestures]);

  useEffect(() => {
    if (props.disableGestures) {
      return;
    }

    const preventBrowserZoomHotkeys = (event: KeyboardEvent) => {
      if (!isCanvasActive || (!event.metaKey && !event.ctrlKey)) {
        return;
      }

      if (['+', '-', '=', '0'].includes(event.key)) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', preventBrowserZoomHotkeys);

    return () => {
      window.removeEventListener('keydown', preventBrowserZoomHotkeys);
    };
  }, [isCanvasActive, props.disableGestures]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'bg-background relative h-full w-full touch-none',
        {
          'cursor-grab': !props.disableGestures && !isPanning,
          'cursor-grabbing': !props.disableGestures && isPanning,
        },
        props.containerClassName,
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        stopPanning();
        setIsCanvasActive(false);
      }}
      onMouseEnter={() => setIsCanvasActive(true)}
    >
      {!props.disableBackground && (
        <div className="bg-size-[16px_16px] absolute inset-0 h-full w-full bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] opacity-50" />
      )}
      <div
        className={cn('relative', props.className)}
        style={{
          width: graphSize.width,
          height: graphSize.height,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map(node => {
          const hasFollowers = !!node.next?.length;
          const hasPrevious = nodes.some(n => n.next?.includes(node.id));
          const content = node.content ? node.content({ node }) : null;
          const hasContent = !!content;
          const hasChildren = !!node.children?.length;

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
                'bg-card transition-color absolute flex grid min-w-72 grid-cols-1 grid-rows-1 justify-start gap-2 rounded-lg border p-2 text-sm shadow-sm',
                {
                  'w-72': !hasChildren,
                  'grid-rows-[auto_1fr]': hasContent || hasChildren,
                  'grid-rows-[auto_auto_1fr]': hasContent && hasChildren,
                  'rounded-xl border-dashed bg-transparent shadow-none': hasChildren,
                },
              )}
              style={{
                left: node.x - node.width / 2,
                top: node.y - node.height / 2,
                minWidth: Math.min(Math.max(node.width, 256), node.maxWidth ?? Infinity),
                minHeight: node.height,
                maxWidth: node.maxWidth,
              }}
            >
              <div className="flex w-full items-center gap-2">
                {node.icon ? node.icon({ className: 'size-4 text-secondary-foreground' }) : null}
                <span className="font-medium">{node.title}</span>
                <div className="ml-auto">
                  {node.headerSuffix ? node.headerSuffix({ node }) : null}
                </div>
              </div>
              <div className="bg-secondary w-full rounded-sm p-2 empty:hidden">
                {node.content ? node.content({ node }) : null}
              </div>
              {!!node.children?.length && (
                <div className="size-full rounded-sm">
                  <Flow
                    nodes={node.children}
                    margin={0}
                    gapX={24}
                    gapY={16}
                    onGraphLayout={graph => {
                      const { width, height } = graph.graph();

                      setNodeSizes(prev => ({
                        ...prev,
                        [node.id]: {
                          width: width + 20,
                          height: node.height + height + 4,
                        },
                      }));
                    }}
                    disableBackground
                    disableGestures
                    className="bg-transparent"
                    isChild
                  />
                </div>
              )}
              {hasFollowers && (
                <div className="border-border bg-background absolute left-full top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all" />
              )}
              {hasPrevious && (
                <div className="border-border bg-background absolute left-0 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all" />
              )}
            </div>
          );
        })}
        <svg
          className="pointer-events-none absolute left-0 top-0 -z-10"
          style={{ width: graphSize.width, height: graphSize.height }}
        >
          {edges.filter(Boolean).map(edge => {
            const fromNode = nodes.find(node => node.id === edge.from);
            const toNode = nodes.find(node => node.id === edge.to);

            if (!fromNode || !toNode) {
              return null;
            }

            return (
              <path
                key={edge.from + edge.to}
                className="stroke-border animate-dash transition-color animate-[dash_500ms_linear_infinite] fill-none stroke-2 [stroke-dasharray:12_8]"
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
      {!props.isChild && (
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
          <div className="bg-card grid w-96 grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border p-2 shadow-sm">
            <div className="flex flex-1 items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setView(prev => ({ ...prev, scale: prev.scale - ZOOM_STEP }))}
                  >
                    <ZoomOutIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>
              <Slider
                value={[view.scale]}
                onValueChange={value => setView(prev => ({ ...prev, scale: value[0] }))}
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={ZOOM_STEP}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setView(prev => ({ ...prev, scale: prev.scale + ZOOM_STEP }))}
                  >
                    <ZoomInIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>
            </div>
            <Separator orientation="vertical" className="h-6!" />
            <Button variant="ghost" size="sm" onClick={fitInView}>
              <MaximizeIcon className="size-4" />
              Fit in view
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
