import { Fragment, ReactNode, useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { GraphQLHighlight } from '@/components/common/GraphQLSDLBlock';
import { Page, TargetLayout } from '@/components/layouts/target';
import { Badge } from '@/components/ui/badge';
import { Meta } from '@/components/ui/meta';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWidthSync, WidthSyncProvider } from './target-insights-new-width';

const rootSpan: SpanProps = {
  id: 'root',
  title: 'FetchProducts',
  serviceName: 'gateway',
  duration: 8.12,
  startedAt: 0,
  children: [
    {
      id: '1ns581b',
      title: 'plan',
      serviceName: 'gateway',
      duration: 2.3,
      startedAt: 0.2,
      children: [],
    },
    {
      id: '213hbsdgs',
      title: 'subgraph',
      serviceName: 'products',
      duration: 4.06,
      startedAt: 2.3,
      children: [
        {
          id: '138sndhs',
          title: 'parse',
          duration: 0.1,
          startedAt: 2.4,
          children: [],
        },
        {
          id: '1n1bsxs1',
          title: 'validate',
          duration: 0.9,
          startedAt: 2.5,
          children: [],
        },
      ],
    },
    {
      id: '1n23sxs1',
      title: 'subgraph',
      serviceName: 'prices',
      duration: 2.03,
      startedAt: 4.06,
      children: [
        {
          id: '19nxb23b',
          title: 'parse',
          duration: 0.1,
          startedAt: 4.1,
          children: [],
        },
        {
          id: '284bsdb1',
          title: 'validate',
          duration: 1.2,
          startedAt: 4.2,
          children: [
            {
              id: '284bsdb1',
              title: 'async validation',
              duration: 0.2,
              startedAt: 5.4,
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

type Trace = {
  id: string;
  timestamp: number;
  duration: number;
  status: 'ok' | 'error';
  kind: 'query' | 'mutation' | 'subscription';
  operationName: string;
  operationHash: string;
  httpStatus: number;
  httpMethod: 'GET' | 'POST';
  httpHost: string;
  httpRoute: string;
  httpUrl: string;
  subgraphNames: string[];
};

const now = new Date();
function generateTraceId() {
  return [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}
const data: Trace[] = [
  {
    id: generateTraceId(),
    timestamp: now.getTime(),
    status: 'ok',
    duration: 6019,
    kind: 'query',
    operationName: 'FetchProducts',
    operationHash: '3h1s',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['link', 'products', 'prices'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 120000,
    status: 'ok',
    duration: 6019,
    kind: 'query',
    operationName: 'FetchProducts',
    operationHash: '3h1s',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['link', 'products', 'prices'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 240000,
    status: 'error',
    duration: 10045,
    kind: 'mutation',
    operationName: 'UpdateProduct',
    operationHash: '8f2b',
    httpStatus: 500,
    httpMethod: 'POST',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['products'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 360000,
    status: 'ok',
    duration: 3045,
    kind: 'query',
    operationName: 'GetUser',
    operationHash: 'a7g4',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 480000,
    status: 'ok',
    duration: 4521,
    kind: 'query',
    operationName: 'ListOrders',
    operationHash: 'c9h2',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['orders', 'users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 600000,
    status: 'error',
    duration: 7890,
    kind: 'mutation',
    operationName: 'CancelOrder',
    operationHash: 'd1k8',
    httpStatus: 400,
    httpMethod: 'POST',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['orders'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 720000,
    status: 'ok',
    duration: 2156,
    kind: 'subscription',
    operationName: 'OrderStatusUpdated',
    operationHash: 'e4m7',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['orders'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 840000,
    status: 'ok',
    duration: 5092,
    kind: 'query',
    operationName: 'FetchCart',
    operationHash: 'f2p9',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['cart', 'products'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 960000,
    status: 'ok',
    duration: 6820,
    kind: 'mutation',
    operationName: 'AddToCart',
    operationHash: 'g7r5',
    httpStatus: 201,
    httpMethod: 'POST',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['cart'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: generateTraceId(),
    timestamp: now.getTime() + 1080000,
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
];

const fetchProductsQueryString = `
  query FetchProduct {
    products {
      id
      name
      price
    }
  }
`;

interface TraceAttribute {
  name: string;
  value: string | number | ReactNode;
  category?: string;
}

function TraceView(props: { rootSpan: SpanProps; serviceNames: string[] }) {
  const [width] = useWidthSync();
  const [highlightedServiceName, setHighlightedServiceName] = useState<string | null>(null);
  const rootSpan = props.rootSpan;
  const serviceNames = props.serviceNames;

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-800">
        <div className="flex w-full items-center text-xs text-white">
          <div className="h-12 shrink-0 py-2" style={{ width }}>
            <div className="pl-4">
              <div className="font-medium">Timeline</div>
              <div className="text-xs text-gray-500">Spans and details</div>
            </div>
          </div>
          <div className="h-12 grow pr-8">
            <div className="relative h-full w-full">
              <div className="absolute left-0 top-6 -translate-x-1/2 text-center">0ms</div>
              <div className="absolute bottom-0 left-0 h-2 w-px bg-[#27272a]" />
              <div className="absolute left-[25%] top-6 -translate-x-1/2 text-center">2.03ms</div>
              <div className="absolute bottom-0 left-[25%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
              <div className="absolute left-[50%] top-6 -translate-x-1/2 text-center">4.06ms</div>
              <div className="absolute bottom-0 left-[50%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
              <div className="absolute left-[75%] top-6 -translate-x-1/2 text-center">6.09ms</div>
              <div className="absolute bottom-0 left-[75%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
              <div className="absolute right-0 top-6 translate-x-1/2 text-center">8.12ms</div>
              <div className="absolute bottom-0 right-0 h-2 w-px -translate-x-1/2 bg-[#27272a]" />
            </div>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-grow">
        <div>
          <TraceTree
            leftPanelWidth={width}
            rootSpan={rootSpan}
            highlightedServiceName={highlightedServiceName}
          />
        </div>
      </ScrollArea>
      <div className="sticky bottom-0 z-10 px-2 py-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
          {serviceNames.map((serviceName, index) => (
            <div
              key={serviceName}
              className="flex cursor-pointer items-center gap-2 hover:text-white"
              onMouseEnter={() => setHighlightedServiceName(serviceName)}
              onMouseLeave={() => setHighlightedServiceName(null)}
            >
              <div
                className="size-2"
                style={{
                  backgroundColor: colors[index % colors.length],
                }}
              />
              <div>{serviceName}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TreeIcon(props: {
  level: number;
  /**
   * Decides whether or not to draw the └[]
   */
  hasParent: boolean;
  /**
   * Decides whether or not to draw
   */
  isLeaf: boolean;
  /**
   * Wheter or not to draw ├
   */
  isLastChild: boolean;
  childrenCount: number;
  isCollapsed: boolean;
  lines: boolean[];
  onClick?: () => void;
}) {
  const levelWidth = 16;
  const base = 30;
  const width = base + props.level * levelWidth;

  const leftSideEdgeStart = (props.level - 1) * levelWidth + 12;
  const leftSideEdgeEnd = leftSideEdgeStart + 15;

  const rectLeft = 2 + props.level * levelWidth;

  return (
    <svg
      width={width}
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      className="shrink"
      onClick={props.onClick}
    >
      {/* left-side line */}
      {props.hasParent ? (
        <line x1={leftSideEdgeStart} y1="16" x2={leftSideEdgeEnd} y2="16" stroke="currentColor" />
      ) : null}

      {/* bottom line */}
      {props.isLeaf || props.isCollapsed ? null : (
        <line x1={rectLeft + 10} x2={rectLeft + 10} y1="16" y2="32" stroke="currentColor" />
      )}

      {/* leaf span */}
      {props.isLeaf ? (
        <circle cx={props.level * 16 + 12} cy="16" r="3" fill="currentColor"></circle>
      ) : (
        // number block
        <>
          <rect
            x={rectLeft}
            y="8"
            width="20"
            height="16"
            rx="3px"
            ry="3px"
            fill={props.isCollapsed ? 'currentColor' : 'black'}
            stroke="currentColor"
          />
          <text
            x={rectLeft + 10}
            y="20"
            style={{ fontSize: 10 }}
            textAnchor="middle"
            fontWeight={props.isCollapsed ? 700 : 500}
            fill={props.isCollapsed ? 'white' : 'currentColor'}
          >
            {props.childrenCount}
          </text>
        </>
      )}

      {/* this line is the vertical line (for each parent groups) */}
      {props.lines.map((line, index) =>
        line ? (
          <line
            x1={16 * (index + 1) - 4}
            x2={16 * (index + 1) - 4}
            y1="0"
            y2={index === props.level - 1 && props.isLastChild ? 16 : 32}
            stroke="currentColor"
          />
        ) : null,
      )}
    </svg>
  );
}

function TabButton(props: { isActive: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      className={cn(
        'border-b-2 px-2 py-2',
        props.isActive ? 'border-[#2662d8]' : 'hover:border-border border-transparent',
      )}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function TraceResize(props: { minWidth: number; maxWidth: number }) {
  const [width, setWidth] = useWidthSync();
  const [isDragging, setIsDragging] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef(0);
  const startWidthRef = useRef(0);
  const { minWidth, maxWidth } = props;

  // Handle the start of dragging
  const handleDragStart = useCallback(
    (clientX: number) => {
      setIsDragging(true);
      startPosRef.current = clientX;
      startWidthRef.current = width;

      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
    },
    [width],
  );

  // Handle dragging
  const handleDrag = useCallback(
    (clientX: number) => {
      if (!isDragging) return;
      const delta = clientX - startPosRef.current;
      let newWidth = startWidthRef.current + delta;
      // Constrain to min/max
      newWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setWidth(newWidth);
    },
    [isDragging, minWidth, maxWidth, setWidth],
  );

  // Handle the end of dragging
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = '';
  }, []);

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      // Set pointer capture on the drag handle element
      if (handleRef.current) {
        handleRef.current.setPointerCapture(e.pointerId);
      }
      handleDragStart(e.clientX);
    },
    [handleDragStart],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      handleDrag(e.clientX);
    },
    [isDragging, handleDrag],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      // Release pointer capture
      if (handleRef.current) {
        handleRef.current.releasePointerCapture(e.pointerId);
      }
      handleDragEnd();
    },
    [handleDragEnd],
  );

  return (
    <div
      className="absolute bottom-0 top-0 z-20 w-[5px] cursor-ew-resize"
      style={{ left: width - 2 }} // Position 2px to the left of the center
      ref={handleRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Invisible wider hit area */}
      <div
        className={cn(
          'absolute inset-y-0 left-[2px] w-px bg-gray-800',
          isDragging ? 'bg-gray-600' : 'hover:bg-gray-700',
        )}
      />
    </div>
  );
}

function TraceTree(props: {
  highlightedServiceName: string | null;
  rootSpan: SpanProps;
  leftPanelWidth: number;
}) {
  const [width] = useWidthSync();
  const minWidth = 175;
  const maxWidth = 450;
  const serviceNames = listServiceNames(props.rootSpan);
  const serviceNameToColorMap = Object.fromEntries(
    serviceNames.map((name, index) => [name, colors[index % colors.length]]),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={containerRef}>
      <TraceResize minWidth={minWidth} maxWidth={maxWidth} />
      <Node
        key={props.rootSpan.id}
        level={0}
        highlightedServiceName={props.highlightedServiceName}
        totalDuration={rootSpan.duration}
        leftPanelWidth={width}
        span={props.rootSpan}
        parentSpan={null}
        groupLines={[]}
        parentColor={null}
        color={colors[0]}
        serviceNameToColorMap={serviceNameToColorMap}
      />
    </div>
  );
}

type SpanProps = {
  id: string;
  title: string;
  serviceName?: string;
  duration: number;
  startedAt: number;
  children: SpanProps[];
};

type NodeProps = {
  highlightedServiceName: string | null;
  level: number;
  totalDuration: number;
  leftPanelWidth: number;
  span: SpanProps;
  parentSpan: SpanProps | null;
  groupLines: boolean[];
  color: string;
  parentColor: string | null;
  serviceNameToColorMap: Record<string, string>;
};

function countChildren(spans: SpanProps[]): number {
  return spans.reduce((acc, span) => acc + countChildren(span.children), spans.length);
}

function _listServiceNames(span: SpanProps, serviceNames: string[]) {
  if (span.serviceName && !serviceNames.includes(span.serviceName)) {
    serviceNames.push(span.serviceName);
  }

  for (const child of span.children) {
    _listServiceNames(child, serviceNames);
  }
}

function listServiceNames(span: SpanProps): string[] {
  const serviceNames: string[] = [];
  _listServiceNames(span, serviceNames);
  return serviceNames;
}

const colors = [
  '#2662d8',
  '#2eb88a',
  '#e88d30',
  '#af56db',
  '#7BA4F9',
  '#D8B5FF',
  '#64748B',
  '#6C5CE7',
  '#F27059',
  '#2D9D78',
];
function Node(props: NodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const leftPositionPercentage = roundFloatToTwoDecimals(
    (props.span.startedAt / props.totalDuration) * 100,
  );
  const widthPercentage = roundFloatToTwoDecimals(
    (props.span.duration / props.totalDuration) * 100,
  );

  const isNearRightEdge = leftPositionPercentage + widthPercentage > 85;
  const isDimmed =
    typeof props.highlightedServiceName === 'string' &&
    props.highlightedServiceName !== props.span.serviceName;

  const isLastChild =
    props.parentSpan?.children[props.parentSpan.children.length - 1].id === props.span.id;

  const childrenCount = collapsed
    ? countChildren(props.span.children) + 1
    : props.span.children.length;
  const canBeCollapsed = props.span.children.length > 0;

  const color = props.color;
  const parentColor = props.parentColor ?? color;

  const percentageOfTotal = ((props.span.duration / props.totalDuration) * 100).toFixed(2);
  const percentageOfParent = props.parentSpan
    ? ((props.span.duration / props.parentSpan.duration) * 100).toFixed(2)
    : null;

  return (
    <>
      <div className="cursor-pointer pr-8 odd:bg-gray-800/20 hover:bg-gray-900">
        <div className="relative flex h-8 w-full items-center overflow-hidden">
          <div
            className="relative flex h-8 shrink-0 items-center gap-x-2 overflow-hidden pl-1"
            style={{ width: `${props.leftPanelWidth}px` }}
          >
            <div className="flex h-8 shrink-0 items-center overflow-hidden overflow-ellipsis whitespace-nowrap text-gray-500">
              <TreeIcon
                key={`tree-icon-${props.span.id}`}
                isLeaf={props.span.children.length === 0}
                isLastChild={isLastChild}
                childrenCount={childrenCount}
                hasParent={!!props.parentSpan}
                level={props.level}
                lines={props.groupLines}
                isCollapsed={collapsed}
                onClick={canBeCollapsed ? () => setCollapsed(collapsed => !collapsed) : undefined}
              />
            </div>
            <div
              className={cn('whitespace-nowrap text-xs', isDimmed ? 'text-gray-500' : 'text-white')}
            >
              {props.span.title}
            </div>
            {props.span.serviceName ? (
              <div
                className={cn(
                  'overflow-hidden overflow-ellipsis whitespace-nowrap text-xs',
                  isDimmed ? 'text-gray-600' : 'text-gray-500',
                )}
              >
                {props.span.serviceName}
              </div>
            ) : null}
          </div>
          <div
            className={cn(
              'relative flex h-full grow items-center overflow-hidden',
              isDimmed ? 'opacity-25' : '',
            )}
          >
            <Tooltip disableHoverableContent delayDuration={100}>
              <TooltipTrigger asChild>
                <div
                  className={cn('absolute z-20 block h-6 min-w-[1px] select-none rounded-sm')}
                  style={{
                    left: `min(${leftPositionPercentage}%, 100% - 1px)`,
                    width: `${widthPercentage}%`,
                    backgroundColor: color,
                  }}
                >
                  <div
                    className="absolute top-1/2 flex -translate-y-1/2 items-center whitespace-nowrap px-[4px] font-mono leading-none"
                    style={{
                      fontSize: '11px',
                      ...(isNearRightEdge ? { right: '6px' } : { left: `calc(100% + 6px)` }),
                    }}
                  >
                    {props.span.duration}ms
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="overflow-hidden rounded-lg p-2 text-xs text-gray-100 shadow-lg sm:min-w-[200px]"
              >
                {/* Content */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-y-2">
                    <div className="text-gray-400">Duration</div>
                    <div className="text-right font-mono">
                      <span>{props.span.duration}ms</span>
                    </div>

                    <div className="text-gray-400">Started At</div>
                    <div className="text-right font-mono">{props.span.startedAt}ms</div>

                    <div className="text-gray-400">% of Total</div>
                    <div className="text-right font-mono">{percentageOfTotal}%</div>

                    <div className="col-span-2">
                      {/* Timeline visualization */}
                      <div>
                        <div className="h-[2px] w-full overflow-hidden bg-gray-800">
                          <div
                            className="h-full"
                            style={{ width: `${percentageOfTotal}%`, backgroundColor: colors[0] }}
                          />
                        </div>
                      </div>
                    </div>

                    {percentageOfParent === null ? null : (
                      <>
                        <div className="text-gray-400">% of Parent</div>
                        <div className="text-right font-mono">{percentageOfParent}%</div>

                        <div className="col-span-2">
                          {/* Timeline visualization */}
                          <div>
                            <div className="h-[2px] w-full overflow-hidden bg-gray-800">
                              <div
                                className="h-full"
                                style={{
                                  width: `${percentageOfParent}%`,
                                  backgroundColor: parentColor,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      {collapsed
        ? null
        : props.span.children.length
          ? props.span.children.map(childSpan => {
              const span = {
                ...childSpan,
                // if the child span doesn't have a serviceName, use the parent's serviceName
                serviceName: childSpan.serviceName ?? props.span.serviceName,
              };

              return (
                <Node
                  key={span.id}
                  highlightedServiceName={props.highlightedServiceName}
                  leftPanelWidth={props.leftPanelWidth}
                  totalDuration={props.totalDuration}
                  span={span}
                  level={props.level + 1}
                  parentSpan={props.span}
                  groupLines={
                    isLastChild
                      ? // remove the last line if it's the last span from the group
                        props.groupLines.slice(0, -1).concat(false, true)
                      : props.groupLines.concat(true)
                  }
                  parentColor={color}
                  color={span.serviceName ? props.serviceNameToColorMap[span.serviceName] : color}
                  serviceNameToColorMap={props.serviceNameToColorMap}
                />
              );
            })
          : null}
    </>
  );
}

function GridTable(props: {
  rows: Array<{
    key: string;
    value: ReactNode;
  }>;
}) {
  return (
    <div className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2">
      {props.rows.map(row => (
        <Fragment key={row.key}>
          <div className="font-sans text-gray-400">{row.key}</div>
          <div className="text-right font-mono">{row.value}</div>
        </Fragment>
      ))}
    </div>
  );
}

function roundFloatToTwoDecimals(num: number) {
  return Math.round(num * 100) / 100;
}

function TraceSheet({ trace }: { trace: Trace | null }) {
  const [activeView, setActiveView] = useState<'attributes' | 'events' | 'operation'>('attributes');

  if (!trace) {
    return null;
  }

  const attributes: Array<TraceAttribute> = [
    {
      name: 'graphql.operationKind',
      value: trace.kind,
      category: 'GraphQL',
    },
    {
      name: 'graphql.subgraphs',
      value: trace.subgraphNames.join(', '),
      category: 'GraphQL',
    },
    {
      name: 'http.method',
      value: trace.httpMethod,
      category: 'HTTP',
    },
    {
      name: 'http.host',
      value: trace.httpHost,
      category: 'HTTP',
    },
    {
      name: 'http.route',
      value: trace.httpRoute,
      category: 'HTTP',
    },
    {
      name: 'http.url',
      value: trace.httpUrl,
      category: 'HTTP',
    },
    {
      name: 'http.status',
      value: trace.httpStatus,
      category: 'HTTP',
    },
  ];

  const serviceNames = listServiceNames(rootSpan);

  return (
    <div className="h-full">
      <TooltipProvider>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={70} minSize={20} maxSize={80}>
            <WidthSyncProvider defaultWidth={251}>
              <TraceView rootSpan={rootSpan} serviceNames={serviceNames} />
            </WidthSyncProvider>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={30} minSize={10} maxSize={80}>
            <div className="flex h-full flex-col">
              <div className="sticky top-0 z-10 border-b border-gray-800">
                <div className="item-center flex w-full gap-x-4 px-2 text-xs font-medium">
                  <TabButton
                    isActive={activeView === 'attributes'}
                    onClick={() => setActiveView('attributes')}
                  >
                    <div className="flex items-center gap-x-2">
                      <div>Attributes</div>
                      <div>
                        <Badge
                          variant="secondary"
                          className="rounded-md px-2 py-0.5 text-[10px] font-thin"
                        >
                          7
                        </Badge>
                      </div>
                    </div>
                  </TabButton>
                  <TabButton
                    isActive={activeView === 'events'}
                    onClick={() => setActiveView('events')}
                  >
                    <div className="flex items-center gap-x-2">
                      <div>Events</div>
                      <div>
                        <Badge
                          variant="secondary"
                          className="rounded-md px-2 py-0.5 text-[10px] font-thin"
                        >
                          3
                        </Badge>
                      </div>
                    </div>
                  </TabButton>
                  <TabButton
                    isActive={activeView === 'operation'}
                    onClick={() => setActiveView('operation')}
                  >
                    <div className="flex items-center gap-x-2">
                      <div>Operation</div>
                    </div>
                  </TabButton>
                </div>
              </div>
              <ScrollArea className="relative grow">
                <div className="h-full">
                  {activeView === 'attributes' ? (
                    <div>
                      {attributes.length > 0 ? (
                        <div>
                          {attributes.map((attr, index) => (
                            <div
                              key={index}
                              className="border-border flex items-center justify-between border-b px-3 py-3 text-xs"
                            >
                              <div className="text-gray-400">{attr.name}</div>
                              <div className="font-mono text-white">{attr.value}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center">
                          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-gray-500" />
                          <p className="text-xs text-gray-500">
                            No attributes found for this trace
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {activeView === 'events' ? (
                    <div className="p-4">
                      <div className="space-y-2">
                        {[
                          {
                            code: 'DB_CONNECTION_ERROR',
                            message: 'Connection to database timed out after 5 seconds',
                            stacktrace: `Error: Connection to database timed out\n\tat PostgresClient.connect (/app/db.js:42:3)\n\tat ProductService.getProducts (/app/services/product.js:15:5)`,
                          },
                          {
                            code: 'GRAPHQL_PARSE_FAILED',
                            message: 'Sent GraphQL Operation cannot be parsed',
                          },
                          {
                            code: 'TIMEOUT_ERROR',
                            message: 'Operation timed out after 10 seconds',
                          },
                        ].map((exception, index) => (
                          <div
                            key={index}
                            className="overflow-hidden rounded-md border border-red-800/50 bg-red-900/20"
                          >
                            <div className="flex items-center justify-between bg-red-900/40 px-3 py-2">
                              <span className="font-mono text-xs font-medium text-red-300">
                                {exception.code}
                              </span>
                              <Badge
                                variant="outline"
                                className="border-red-700 bg-red-950 text-[10px] text-red-300"
                              >
                                Exception
                              </Badge>
                            </div>
                            <div className="p-3 text-xs">
                              <p className="text-gray-300">{exception.message}</p>
                              {exception.stacktrace && (
                                <pre className="mt-2 overflow-x-auto rounded bg-black/50 p-2 font-mono text-[10px] leading-tight text-gray-400">
                                  {exception.stacktrace}
                                </pre>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {activeView === 'operation' ? (
                    <div className="absolute bottom-0 top-0 w-full">
                      <GraphQLHighlight
                        height={'100%'}
                        options={{
                          fontSize: 10,
                          minimap: { enabled: false },
                        }}
                        code={fetchProductsQueryString}
                      />
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </TooltipProvider>
    </div>
  );
}

function TargetInsightsNewPageContent() {
  const traceInSheet = data[0];

  return <TraceSheet trace={traceInSheet} />;
}

export function TargetInsightsNewTracePage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  return (
    <>
      <Meta title="Trace 12323134" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Insights}
        className="flex flex-col"
      >
        <div className="flex flex-1 flex-col">
          <AutoSizer disableWidth>
            {size => (
              <div className="w-full" style={{ height: size.height }}>
                <TargetInsightsNewPageContent />
              </div>
            )}
          </AutoSizer>
        </div>
      </TargetLayout>
    </>
  );
}
