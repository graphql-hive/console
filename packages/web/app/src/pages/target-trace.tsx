import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { formatDate } from 'date-fns';
import {
  AlertTriangle,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Clock,
  Link as LinkLucide,
  PieChart,
  Play,
  TreePine,
} from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useQuery } from 'urql';
import { Badge } from '@/components/base/badge/badge';
import { Button } from '@/components/base/button/button';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { NotFound } from '@/components/base/not-found/not-found';
import { Sheet } from '@/components/base/overlays/sheet/sheet';
import { ScrollArea } from '@/components/base/scroll-area/scroll-area';
import { Tabs } from '@/components/base/tabs/tabs';
import { GraphQLHighlight } from '@/components/common/GraphQLSDLBlock';
import { LayoutContent } from '@/components/layouts/layout-content';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { Meta } from '@/components/ui/meta';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Skeleton } from '@/components/ui/skeleton';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useClipboard, useSlugs } from '@/lib/hooks';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from '@tanstack/react-router';
import { useWidthSync, WidthSyncProvider } from './traces/target-traces-width';

const rootTraceColor = 'rgb(244, 183, 64)';

interface TraceAttribute {
  name: string;
  value: string;
}

function TraceView(props: {
  rootSpan: SpanFragmentWithChildren;
  serviceNames: string[];
  totalTraceDuration: bigint;
  traceId: string;
}) {
  const [width] = useWidthSync();
  const [highlightedServiceName, setHighlightedServiceName] = useState<string | null>(null);

  const timestamps = splitNanosecondsToMsIntervals(props.totalTraceDuration);

  return (
    <div className="flex h-full flex-col">
      <div className="border-neutral-5 sticky top-0 z-10 border-b">
        <div className="text-neutral-12 flex w-full items-center text-xs">
          <div className="h-12 shrink-0 py-2" style={{ width }}>
            <div className="pl-4">
              <div className="font-medium">Timeline</div>
              <div className="text-neutral-10 text-xs">Spans and details</div>
            </div>
          </div>
          <div className="h-12 grow pr-8">
            <div className="relative size-full">
              <div className="absolute left-0 top-6 -translate-x-1/2 text-center">
                {formatMsTimestamp(timestamps[0])}
              </div>
              <div className="bg-line absolute bottom-0 left-0 h-2 w-px" />
              <div className="absolute left-[25%] top-6 -translate-x-1/2 text-center">
                {formatMsTimestamp(timestamps[1])}
              </div>
              <div className="bg-line absolute bottom-0 left-[25%] h-2 w-px -translate-x-1/2" />
              <div className="absolute left-[50%] top-6 -translate-x-1/2 text-center">
                {formatMsTimestamp(timestamps[2])}
              </div>
              <div className="bg-line absolute bottom-0 left-[50%] h-2 w-px -translate-x-1/2" />
              <div className="absolute left-[75%] top-6 -translate-x-1/2 text-center">
                {formatMsTimestamp(timestamps[3])}
              </div>
              <div className="bg-line absolute bottom-0 left-[75%] h-2 w-px -translate-x-1/2" />
              <div className="absolute right-0 top-6 translate-x-1/2 text-center">
                {formatMsTimestamp(timestamps[4])}
              </div>
              <div className="bg-line absolute bottom-0 right-0 h-2 w-px -translate-x-1/2" />
            </div>
          </div>
        </div>
      </div>
      <ScrollArea fill>
        <div>
          <TraceTree
            leftPanelWidth={width}
            rootSpan={props.rootSpan}
            highlightedServiceName={highlightedServiceName}
            serviceNames={props.serviceNames}
            traceId={props.traceId}
          />
        </div>
      </ScrollArea>
      {props.serviceNames && (
        <div className="sticky bottom-0 z-10 px-2 py-4">
          <div className="text-neutral-10 flex flex-wrap items-center justify-center gap-6 text-xs">
            {props.serviceNames.map(serviceName => (
              <div
                key={serviceName}
                className="hover:text-neutral-12 flex cursor-pointer items-center gap-2"
                onMouseEnter={() => setHighlightedServiceName(serviceName)}
                onMouseLeave={() => setHighlightedServiceName(null)}
              >
                <div
                  className="size-2"
                  style={{
                    backgroundColor: stringToHSL(serviceName),
                  }}
                />
                <div>{serviceName}</div>
              </div>
            ))}
          </div>
        </div>
      )}
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
        <circle cx={props.level * 16 + 12} cy="16" r="3" fill="currentColor" />
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
            key={`${props.level}_${index}`}
          />
        ) : null,
      )}
    </svg>
  );
}

function CountedLabel(props: { label: string; count: number }) {
  return (
    <>
      {props.label}
      <Badge content={String(props.count)} variants={{ variant: 'secondary', size: 'sm' }} />
    </>
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
      className="absolute inset-y-0 z-20 w-[5px] cursor-ew-resize"
      style={{ left: width - 2 }} // Position 2px to the left of the center
      ref={handleRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Invisible wider hit area */}
      <div
        className={cn(
          'bg-neutral-5 absolute inset-y-0 left-[2px] w-px',
          isDragging ? 'bg-neutral-8' : 'hover:bg-neutral-2',
        )}
      />
    </div>
  );
}

function TraceTree(props: {
  highlightedServiceName: string | null;
  rootSpan: SpanFragmentWithChildren;
  leftPanelWidth: number;
  serviceNames: Array<string>;
  traceId: string;
}) {
  const rootSpan = useFragment(SpanFragment, props.rootSpan.span);
  const [width] = useWidthSync();
  const minWidth = 175;
  const maxWidth = 450;
  const containerRef = useRef<HTMLDivElement>(null);

  const durationNs = differenceInNanoseconds(rootSpan.endTime, rootSpan.startTime);

  return (
    <div className="relative" ref={containerRef}>
      <TraceResize minWidth={minWidth} maxWidth={maxWidth} />
      <SpanNode
        key={rootSpan.id}
        level={0}
        highlightedServiceName={props.highlightedServiceName}
        totalDurationNs={durationNs}
        leftPanelWidth={width}
        span={props.rootSpan}
        parentSpan={null}
        groupLines={[]}
        parentColor={null}
        color={rootTraceColor}
        serviceName={null}
        isLastChild={false}
        traceId={props.traceId}
      />
    </div>
  );
}

type SpanNodeProps = {
  highlightedServiceName: string | null;
  level: number;
  totalDurationNs: bigint;
  leftPanelWidth: number;
  span: SpanFragmentWithChildren;
  parentSpan: SpanFragmentWithChildren | null;
  groupLines: boolean[];
  color: string;
  parentColor: string | null;
  serviceName: string | null;
  isLastChild: boolean;
  traceId: string;
};

function countChildren(spans: SpanFragmentWithChildren[]): number {
  return spans.reduce((acc, span) => acc + countChildren(span.children), spans.length);
}

type NodeElementProps = {
  leftPositionPercentage: number;
  widthPercentage: number;
  isNearRightEdge: boolean;
  durationStr: string;
  color: string;
};

function NodeElement(props: NodeElementProps) {
  return (
    <div
      className={cn('relative z-20 block h-6 min-w-px select-none rounded-sm')}
      style={{
        left: `min(${props.leftPositionPercentage}%, 100% - 1px)`,
        width: `${props.widthPercentage}%`,
        backgroundColor: props.color,
      }}
    >
      <div
        className="text-neutral-11 absolute top-1/2 flex -translate-y-1/2 items-center whitespace-nowrap px-[4px] font-mono leading-none"
        style={{
          fontSize: '11px',
          ...(props.isNearRightEdge ? { right: '6px' } : { left: 'calc(100% + 6px)' }),
        }}
      >
        {props.durationStr}
      </div>
    </div>
  );
}

function SpanNode(props: SpanNodeProps) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const span = useFragment(SpanFragment, props.span.span);

  const [collapsed, setCollapsed] = useState(false);
  const leftPositionPercentage = roundFloatToTwoDecimals(
    (nanosecondsToMilliseconds(props.span.startNs) /
      nanosecondsToMilliseconds(props.totalDurationNs)) *
      100,
  );

  const widthPercentage = roundFloatToTwoDecimals(
    (nanosecondsToMilliseconds(props.span.durationNs) /
      nanosecondsToMilliseconds(props.totalDurationNs)) *
      100,
  );

  const isNearRightEdge = leftPositionPercentage + widthPercentage > 85;
  const activeSpanId = useContext(ActiveSpanIdContext);
  const highlightedEvent = useContext(HighlightedEventContext);

  const isDimmed =
    (typeof props.highlightedServiceName === 'string' &&
      props.highlightedServiceName !==
        span.spanAttributes['hive.gateway.upstream.subgraph.name']) ||
    (activeSpanId && activeSpanId !== span.id) ||
    (highlightedEvent && highlightedEvent.spanId !== span.id);

  const childrenCount = collapsed
    ? countChildren(props.span.children) + 1
    : props.span.children.length;

  const canBeCollapsed = props.span.children.length > 0;
  const parentColor = props.parentColor ?? props.color;

  const hasException = span.events.some(event => event.name === 'exception');

  return (
    <>
      <div
        className={cn(
          'odd:bg-neutral-5/20 hover:bg-neutral-2 pr-8',
          hasException && 'bg-critical-tint odd:bg-critical-tint hover:bg-critical-tint-strong',
          highlightedEvent &&
            highlightedEvent.spanId === span.id &&
            'bg-critical-tint-strong odd:bg-critical-tint-strong',
        )}
      >
        <div className="relative flex h-8 w-full items-center overflow-hidden">
          <div
            className="relative flex h-8 shrink-0 items-center gap-x-2 overflow-hidden pl-1"
            style={{ width: `${props.leftPanelWidth}px` }}
          >
            <div
              className={cn(
                'text-neutral-10 flex h-8 shrink-0 items-center truncate',
                canBeCollapsed && 'cursor-pointer',
              )}
            >
              <TreeIcon
                key={`tree-icon-${span.id}`}
                isLeaf={props.span.children.length === 0}
                isLastChild={props.isLastChild}
                childrenCount={childrenCount}
                hasParent={!!props.parentSpan}
                level={props.level}
                lines={props.groupLines}
                isCollapsed={collapsed}
                onClick={canBeCollapsed ? () => setCollapsed(collapsed => !collapsed) : undefined}
              />
            </div>
            <div
              className={cn(
                'flex w-full items-center whitespace-nowrap align-middle text-xs',
                isDimmed ? 'text-neutral-10' : 'text-neutral-12',
              )}
            >
              <span className="mr-1">{span.name}</span>
              {hasException && (
                <span className="ml-auto mr-1 inline-flex">
                  <Badge content="Error" variants={{ variant: 'critical', mono: true }} />
                </span>
              )}
            </div>
            {span.spanAttributes['hive.gateway.upstream.subgraph.name'] ? (
              <div
                className={cn('truncate text-xs', isDimmed ? 'text-neutral-8' : 'text-neutral-10')}
              >
                {span.spanAttributes['hive.gateway.upstream.subgraph.name'] as ReactNode}
              </div>
            ) : null}
          </div>
          <div className="relative w-full">
            <Tooltip
              disableHoverablePopup
              side="bottom"
              trigger={
                <Link
                  className={cn(
                    'relative flex h-full grow cursor-pointer items-center overflow-hidden',
                    isDimmed ? 'opacity-25' : '',
                  )}
                  to="/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId"
                  params={{
                    organizationSlug,
                    projectSlug,
                    targetSlug,
                    traceId: props.traceId,
                  }}
                  search={{ activeSpanId: span.id }}
                >
                  <NodeElement
                    color={props.color}
                    isNearRightEdge={isNearRightEdge}
                    leftPositionPercentage={leftPositionPercentage}
                    widthPercentage={widthPercentage}
                    durationStr={formatNanoseconds(props.span.durationNs)}
                  />
                </Link>
              }
              content={
                <div className="min-w-[200px] space-y-3">
                  <div className="grid grid-cols-2 gap-y-2">
                    <div className="text-neutral-10">Duration</div>
                    <div className="text-right font-mono">
                      <span>{formatNanoseconds(props.span.durationNs)}</span>
                    </div>

                    <div className="text-neutral-10">Started At</div>
                    <div className="text-right font-mono">
                      {formatNanoseconds(props.span.startNs)}
                    </div>

                    <div className="text-neutral-10">% of Total</div>
                    <div className="text-right font-mono">{props.span.percentageOfTotal}%</div>

                    <div className="col-span-2">
                      {/* Timeline visualization */}
                      <div>
                        <div className="bg-neutral-5 h-[2px] w-full overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${props.span.percentageOfTotal}%`,
                              backgroundColor: rootTraceColor,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {props.span.percentageOfParentSpan === null ? null : (
                      <>
                        <div className="text-neutral-10">% of Parent</div>
                        <div className="text-right font-mono">
                          {props.span.percentageOfParentSpan}%
                        </div>

                        <div className="col-span-2">
                          {/* Timeline visualization */}
                          <div>
                            <div className="bg-neutral-5 h-[2px] w-full overflow-hidden">
                              <div
                                className="h-full"
                                style={{
                                  width: `${props.span.percentageOfParentSpan}%`,
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
              }
            />

            {props.span.events.map(event => {
              if (highlightedEvent && event.id !== highlightedEvent.eventId) {
                return null;
              }

              const leftPercentage = roundFloatToTwoDecimals(
                (nanosecondsToMilliseconds(event.timeNs) /
                  nanosecondsToMilliseconds(props.totalDurationNs)) *
                  100,
              );
              const isError = event.name === 'exception';

              return (
                <Tooltip
                  key={event.id}
                  side="bottom"
                  maxWidth="lg"
                  trigger={
                    <Link
                      className={cn(
                        'absolute inset-y-0 z-50 translate-x-[-50%] cursor-pointer px-1',
                      )}
                      style={{ left: `${leftPercentage}%` }}
                      to="/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId"
                      params={{
                        organizationSlug,
                        projectSlug,
                        targetSlug,
                        traceId: props.traceId,
                      }}
                      search={{ activeSpanId: span.id, activeSpanTab: 'events' }}
                    >
                      <div className="relative h-full">
                        <div
                          className={cn(
                            'absolute inset-y-0 w-0.5',
                            isError ? 'bg-critical' : 'bg-warning',
                          )}
                        >
                          <div
                            className={cn(
                              'absolute left-[-3px] top-[-2px] size-2',
                              isError ? 'bg-critical' : 'bg-warning',
                            )}
                          />
                        </div>
                      </div>
                    </Link>
                  }
                  content={
                    <div className="min-w-[200px]">
                      <ExceptionTeaser
                        type={String(event.attributes['exception.type'] ?? '')}
                        message={String(event.attributes['exception.message'] ?? '')}
                        stacktrace={String(event.attributes['exception.stacktrace'] ?? '')}
                        name={event.name}
                      />
                    </div>
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
      {collapsed
        ? null
        : props.span.children.length
          ? props.span.children.map((childSpan, i, arr) => {
              // eslint-disable-next-line react-hooks/rules-of-hooks
              const uchildSpan = useFragment(SpanFragment, childSpan.span);

              const serviceName: string | null =
                (uchildSpan.spanAttributes['hive.gateway.upstream.subgraph.name'] as
                  | string
                  | undefined) ??
                props.serviceName ??
                null;

              const isLastChild = i === arr.length - 1;
              return (
                <SpanNode
                  key={uchildSpan.id}
                  span={childSpan}
                  highlightedServiceName={props.highlightedServiceName}
                  leftPanelWidth={props.leftPanelWidth}
                  totalDurationNs={props.totalDurationNs}
                  level={props.level + 1}
                  parentSpan={props.span}
                  groupLines={
                    props.isLastChild
                      ? // remove the last line if it's the last span from the group
                        props.groupLines.slice(0, -1).concat(false, true)
                      : props.groupLines.concat(true)
                  }
                  parentColor={props.color}
                  color={serviceName ? stringToHSL(serviceName) : props.color}
                  serviceName={serviceName}
                  isLastChild={isLastChild}
                  traceId={props.traceId}
                />
              );
            })
          : null}
    </>
  );
}

const TraceSheet_TraceFragment = graphql(`
  fragment TraceSheet_TraceFragment on Trace {
    id
    subgraphs
    spans {
      id
      ...SpanFragment
      ...SpanSheet_SpanFragment
    }
  }
`);

type TraceSheetProps = {
  trace: FragmentType<typeof TraceSheet_TraceFragment>;
  activeSpanId: string | null;
  activeSpanTab: string | null;
};

type HighlightedEvent = {
  spanId: string;
  eventId: string;
};

const HighlightedEventContext = createContext(null as null | HighlightedEvent);
const ActiveSpanIdContext = createContext(null as null | string);

export function TraceSheet(props: TraceSheetProps) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [activeView, setActiveView] = useState<
    'span-attributes' | 'resource-attributes' | 'events' | 'operation'
  >('span-attributes');
  const trace = useFragment(TraceSheet_TraceFragment, props.trace);

  const [highlightedEvent, setHighlightedEvent] = useState<HighlightedEvent | null>(null);
  const [spanSheetSession, setSpanSheetSession] = useState(0);

  const { rootSpan, spansById, events } = useMemo(
    () => createSpanTreeStructure(trace.spans),
    [trace.spans],
  );
  const rootSpanUnmasked = useFragment(SpanFragment, rootSpan.span);
  const spanAttributes: Array<TraceAttribute> = Array.from(
    Object.entries(rootSpanUnmasked.spanAttributes),
  ).map(([name, value]) => ({
    name,
    value: String(value),
  }));

  const resourceAttributes: Array<TraceAttribute> = Array.from(
    Object.entries(rootSpanUnmasked.resourceAttributes),
  ).map(([name, value]) => ({
    name,
    value: String(value),
  }));

  const totalTraceDuration = differenceInNanoseconds(
    rootSpanUnmasked.endTime,
    rootSpanUnmasked.startTime,
  );

  const navigate = useNavigate({
    from: '/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId',
  });

  return (
    <div className="min-h-0 flex-1">
      <>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={70} minSize={20} maxSize={80}>
            <WidthSyncProvider defaultWidth={251}>
              <HighlightedEventContext.Provider value={highlightedEvent}>
                <ActiveSpanIdContext.Provider value={props.activeSpanId}>
                  <TraceView
                    rootSpan={rootSpan}
                    serviceNames={trace.subgraphs ?? []}
                    totalTraceDuration={totalTraceDuration}
                    traceId={trace.id}
                  />
                </ActiveSpanIdContext.Provider>
              </HighlightedEventContext.Provider>
            </WidthSyncProvider>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={30} minSize={10} maxSize={80}>
            <div className="flex h-full flex-col">
              <div className="sticky top-0 z-10">
                <Tabs
                  size="sm"
                  value={activeView}
                  onValueChange={value => setActiveView(value as typeof activeView)}
                  items={[
                    {
                      value: 'span-attributes',
                      label: <CountedLabel label="Attributes" count={spanAttributes.length} />,
                    },
                    {
                      value: 'resource-attributes',
                      label: (
                        <CountedLabel
                          label="Resource Attributes"
                          count={resourceAttributes.length}
                        />
                      ),
                    },
                    {
                      value: 'events',
                      label: <CountedLabel label="Events" count={events.length} />,
                    },
                    { value: 'operation', label: 'GraphQL Operation' },
                  ]}
                />
              </div>
              <ScrollArea fill>
                <div className="h-full">
                  {activeView === 'span-attributes' ? (
                    <div>
                      {spanAttributes.length > 0 ? (
                        spanAttributes.map(attr => (
                          <AttributeRow
                            attributeKey={attr.name}
                            key={attr.name}
                            value={attr.value}
                          />
                        ))
                      ) : (
                        <div className="py-4 text-center">
                          <AlertTriangle className="text-neutral-10 mx-auto mb-2 size-6" />
                          <p className="text-neutral-10 text-xs">
                            No attributes found for this trace
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {activeView === 'resource-attributes' ? (
                    <div>
                      {resourceAttributes.length > 0 ? (
                        resourceAttributes.map(attr => (
                          <AttributeRow
                            attributeKey={attr.name}
                            key={attr.name}
                            value={attr.value}
                          />
                        ))
                      ) : (
                        <div className="py-4 text-center">
                          <AlertTriangle className="text-neutral-10 mx-auto mb-2 size-6" />
                          <p className="text-neutral-10 text-xs">
                            No resource attributes found for this trace
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {activeView === 'events' ? (
                    <div className="p-4">
                      <div className="space-y-2">
                        {!events.length ? (
                          <div className="text-neutral-8 text-sm">
                            No events occurred during this trace.
                          </div>
                        ) : (
                          events.map(event => (
                            <Link
                              to="/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId"
                              params={{
                                organizationSlug,
                                projectSlug,
                                targetSlug,
                                traceId: trace.id,
                              }}
                              search={{ activeSpanId: event.spanId, activeSpanTab: 'events' }}
                              onMouseOver={() =>
                                setHighlightedEvent({
                                  spanId: event.spanId,
                                  eventId: event.id,
                                })
                              }
                              onMouseLeave={() => {
                                setHighlightedEvent(null);
                              }}
                              className="mb-2 block"
                              key={event.id}
                            >
                              <ExceptionTeaser
                                type={String(event.attributes['exception.type'] ?? '')}
                                message={String(event.attributes['exception.message'] ?? '')}
                                stacktrace={String(event.attributes['exception.stacktrace'] ?? '')}
                                name={event.name}
                              />
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                  {activeView === 'operation' ? (
                    <div className="absolute inset-y-0 w-full">
                      <GraphQLHighlight
                        height="100%"
                        options={{
                          fontSize: 10,
                          minimap: { enabled: false },
                        }}
                        code={rootSpanUnmasked.spanAttributes['graphql.document'] as string}
                      />
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </>
      <SpanSheet
        key={spanSheetSession}
        open={!!props.activeSpanId}
        onOpenChangeComplete={open => {
          if (!open) {
            setSpanSheetSession(s => s + 1);
          }
        }}
        span={trace.spans.find(trace => trace.id === props.activeSpanId) ?? null}
        computedSpanMetrics={
          (props.activeSpanId ? spansById.get(props.activeSpanId) : undefined) ?? null
        }
        onClose={() =>
          navigate({
            to: '/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId',
            search: {},
          })
        }
        traceId={trace.id}
        activeTab={props.activeSpanTab}
      />
    </div>
  );
}

const TargetInsightsNewPageContent_TraceQuery = graphql(/* GraphQL */ `
  query TargetInsightsNewPageContent_TraceQuery(
    $targetSelector: TargetSelectorInput!
    $traceId: ID!
  ) {
    target(reference: { bySelector: $targetSelector }) {
      id
      trace(traceId: $traceId) {
        ...TraceSheet_TraceFragment
        id
        operationName
        duration
        success
        timestamp
        spans {
          id
          name
          parentId
          ...SpanFragment
        }
      }
    }
  }
`);

function TargetInsightsNewPageContent(props: {
  traceId: string;
  activeSpanId: string | null;
  activeSpanTab: string | null;
}) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [result] = useQuery({
    query: TargetInsightsNewPageContent_TraceQuery,
    variables: {
      targetSelector: {
        organizationSlug,
        projectSlug,
        targetSlug,
      },
      traceId: props.traceId,
    },
  });

  const isFetching = result.fetching || result.stale;
  const trace = result.data?.target?.trace;

  return (
    <div className="flex h-full flex-col space-y-4 pt-6">
      <Meta title={`Trace ${props.traceId}`} />
      <SubPageLayoutHeader
        subPageTitle={
          <span className="flex items-center">
            <Link
              to="/$organizationSlug/$projectSlug/$targetSlug/traces"
              params={{
                organizationSlug,
                projectSlug,
                targetSlug,
              }}
            >
              Traces
            </Link>{' '}
            <span className="text-neutral-10 inline-block px-2 italic">/</span>{' '}
            {trace ? (
              <>
                {trace.operationName ?? <span className="text-neutral-10">{'<unknown>'}</span>}
                <span className="text-neutral-10 ml-2 font-mono font-normal">
                  {trace.id.substring(0, 4)}
                </span>
              </>
            ) : (
              <Skeleton className="inline-block h-5 w-[150px]" />
            )}
          </span>
        }
        description={
          <>
            <p>
              Trace ID:{' '}
              {trace?.id ? (
                <>
                  <span className="font-mono"> {trace.id}</span>
                  <CopyIconButton value={trace.id} label="Copy Trace ID" />
                </>
              ) : (
                <Skeleton className="inline-block h-4 w-[200px]" />
              )}
            </p>
            {trace && (
              <div className="mt-2 flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <Clock className="text-neutral-10 size-3" />
                  <span className="text-neutral-11">
                    {formatNanoseconds(BigInt(trace.duration))}
                  </span>
                </div>
                <Badge
                  content={trace.success ? 'Ok' : 'Error'}
                  variants={{ variant: trace.success ? 'success' : 'critical' }}
                />
                <span className="text-neutral-11 font-mono uppercase">
                  {formatDate(trace.timestamp, 'MMM dd HH:mm:ss')}
                </span>
              </div>
            )}
          </>
        }
      />
      {trace && (
        <TraceSheet
          trace={trace}
          activeSpanId={props.activeSpanId}
          activeSpanTab={props.activeSpanTab}
        />
      )}
      {!trace && !isFetching && (
        <>
          <Meta title="Trace Not found" />
          <NotFound title="Trace not found." description="This trace does not exist." />
        </>
      )}
    </div>
  );
}

export function TargetTracePage(props: {
  traceId: string;
  activeSpanId: string | null;
  activeSpanTab: string | null;
}) {
  return (
    <>
      <LayoutContent className="flex flex-col">
        <div className="flex flex-1 flex-col">
          <AutoSizer disableWidth>
            {size => (
              <div className="w-full" style={{ height: size.height }}>
                <TargetInsightsNewPageContent {...props} />
              </div>
            )}
          </AutoSizer>
        </div>
      </LayoutContent>
    </>
  );
}

const SpanFragment = graphql(/* GraphQL */ `
  fragment SpanFragment on Span {
    id
    name
    spanAttributes
    resourceAttributes
    parentId
    startTime
    endTime
    events {
      date
      name
      attributes
    }
  }
`);

type ComputedSpanMetrics = {
  durationNs: bigint;
  startNs: bigint;
  percentageOfTotal: string;
  percentageOfParentSpan: string | null;
};

type SpanEvent = {
  id: string;
  spanId: string;
  name: string;
  attributes: Record<string, unknown>;
  type: string;
  timeNs: bigint;
};

type SpanFragmentWithChildren = {
  id: string;
  span: FragmentType<typeof SpanFragment>;
  children: Array<SpanFragmentWithChildren>;
  events: Array<SpanEvent>;
} & ComputedSpanMetrics;

function createSpanTreeStructure(fragments: Array<FragmentType<typeof SpanFragment>>): {
  rootSpan: SpanFragmentWithChildren;
  spansById: ReadonlyMap<string, SpanFragmentWithChildren>;
  events: ReadonlyArray<SpanEvent>;
} {
  const spansById = new Map</* id */ string, SpanFragmentWithChildren>();
  const events: Array<SpanEvent> = [];

  let rootSpan: SpanFragmentWithChildren | null = null;
  for (const fragment of fragments) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ufragment = useFragment(SpanFragment, fragment);

    const fragmentWithChildren: SpanFragmentWithChildren = {
      id: ufragment.id,
      span: fragment,
      children: [],
      durationNs: differenceInNanoseconds(ufragment.endTime, ufragment.startTime),
      startNs: 0n,
      percentageOfTotal: '',
      percentageOfParentSpan: null,
      events: [],
    };

    spansById.set(ufragment.id, fragmentWithChildren);
    if (ufragment.parentId == null) {
      rootSpan = fragmentWithChildren;
      rootSpan.percentageOfTotal = '100';
    }
  }

  if (!rootSpan) {
    throw new Error('No root found.');
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const uroot = useFragment(SpanFragment, rootSpan.span);
  const startNS = parseRFC3339ToEpochNanos(uroot.startTime);

  let eventIdCounter = 0;

  for (const item of spansById.values()) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const uitem = useFragment(SpanFragment, item.span);

    for (const event of uitem.events) {
      eventIdCounter++;
      const spanEvent: SpanEvent = {
        id: uitem.id + '_' + String(eventIdCounter),
        spanId: uitem.id,
        name: event.name,
        attributes: event.attributes,
        type: 'exception',
        timeNs: parseRFC3339ToEpochNanos(event.date) - startNS,
      };
      events.push(spanEvent);
      item.events.push(spanEvent);
    }

    if (!uitem.parentId) {
      continue;
    }
    const parent = spansById.get(uitem.parentId);
    if (!parent) {
      throw new Error('Missing parent.');
    }

    parent.children.push(item);
    item.startNs = parseRFC3339ToEpochNanos(uitem.startTime) - startNS;
    if (item.percentageOfTotal === '') {
      item.percentageOfTotal = (
        (nanosecondsToMilliseconds(item.durationNs) /
          nanosecondsToMilliseconds(rootSpan.durationNs)) *
        100
      ).toFixed(2);
    }
    item.percentageOfParentSpan = (
      (nanosecondsToMilliseconds(item.durationNs) / nanosecondsToMilliseconds(parent.durationNs)) *
      100
    ).toFixed(2);
  }

  for (const item of spansById.values()) {
    item.children.sort((a, b) => {
      if (a.startNs < b.startNs) {
        return -1;
      }
      if (a.startNs > b.startNs) {
        return 1;
      }
      return 0;
    });
  }

  return { rootSpan, spansById, events };
}

export function formatNanoseconds(nsBigInt: bigint) {
  const TEN_THOUSAND_NS = 10_000n;

  if (nsBigInt === 0n) {
    return '0ms';
  }

  if (nsBigInt < TEN_THOUSAND_NS) {
    return `${nsBigInt}ns`;
  }

  const hundredthsOfMs = nsBigInt / TEN_THOUSAND_NS;
  const msValue = Number(hundredthsOfMs) / 100.0;
  return `${msValue.toFixed(2)}ms`;
}

function parseRFC3339ToEpochNanos(datetime: string) {
  const match = datetime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/,
  );

  if (!match) {
    throw new Error('Invalid RFC 3339 datetime string.');
  }

  const [, year, month, day, hour, minute, second, fraction = '0'] = match;

  // Pad fraction to nanoseconds (9 digits)
  const nanoStr = (fraction + '000000000').slice(0, 9);
  const nanoseconds = parseInt(nanoStr, 10);

  // Use Date.UTC to get milliseconds (integer part of timestamp)
  const milliseconds = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);

  const totalNanoseconds = BigInt(milliseconds) * 1_000_000n + BigInt(nanoseconds);
  return totalNanoseconds;
}

function differenceInNanoseconds(datetime1: string, datetime2: string) {
  const nanos1 = parseRFC3339ToEpochNanos(datetime1);
  const nanos2 = parseRFC3339ToEpochNanos(datetime2);

  return nanos1 - nanos2; // returns a BigInt representing nanoseconds
}

function splitNanosecondsToMsIntervals(nanoseconds: bigint): number[] {
  const intervals: number[] = [0];
  const intervalNs = nanoseconds / 4n;

  for (let i = 0; i < 4; i++) {
    // Convert nanoseconds to milliseconds (with up to 6 decimal places)
    const ms = ((i + 1) * Number(intervalNs)) / 1_000_000;
    intervals.push(ms);
  }

  return intervals;
}

function formatMsTimestamp(timestamp: number) {
  if (timestamp === 0) {
    return '0ms';
  }
  return timestamp.toFixed(2) + 'ms';
}

function stringToHSL(str: string, saturation = 70, lightness = 40) {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use hash to generate HSL values
  const hue = Math.abs(hash) % 360;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function nanosecondsToMilliseconds(nsBigInt: bigint) {
  const oneMillion = 1_000_000n;
  const msBigInt = nsBigInt / oneMillion; // BigInt division, truncates remainder

  return Number(msBigInt); // Convert BigInt to Number
}

function roundFloatToTwoDecimals(num: number) {
  return Math.round(num * 100) / 100;
}

const SpanSheet_SpanFragment = graphql(`
  fragment SpanSheet_SpanFragment on Span {
    id
    resourceAttributes
    spanAttributes
    name
    duration
    parentId
    events {
      name
      attributes
      date
    }
  }
`);

type SpanSheetProps = {
  open: boolean;
  onOpenChangeComplete: (open: boolean) => void;
  /** Null while closed. */
  span: FragmentType<typeof SpanSheet_SpanFragment> | null;
  computedSpanMetrics: ComputedSpanMetrics | null;
  onClose: () => void;
  traceId: string;
  activeTab: string | null;
};

function SpanSheet(props: SpanSheetProps) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const currentSpan = useFragment(SpanSheet_SpanFragment, props.span);
  // The last span stays up through the close transition.
  const span = useKeepPreviousData(currentSpan ?? undefined, !props.open);
  const computedSpanMetrics = useKeepPreviousData(
    props.computedSpanMetrics ?? undefined,
    !props.open,
  );
  const [activeView, setActiveView] = useState<
    'span-attributes' | 'resource-attributes' | 'events' | 'operation'
  >((props.activeTab as 'events') ?? 'span-attributes');
  // The sheet mounts closed, so the tab the URL asks for is read each time it opens rather than
  // once at mount.
  const requestedView = `${props.open}:${props.activeTab ?? ''}`;
  const [seenRequestedView, setSeenRequestedView] = useState(requestedView);
  if (requestedView !== seenRequestedView) {
    setSeenRequestedView(requestedView);
    if (props.open) {
      setActiveView((props.activeTab as 'events') ?? 'span-attributes');
    }
  }
  const clipboard = useClipboard();

  // TODO: maybe loading or not found state???
  if (!span) {
    return null;
  }

  const spanAttributes = Array.from(Object.entries(span.spanAttributes)).map(
    ([key, value]) => ({ key, value }) satisfies { key: string; value: unknown },
  );

  const resourceAttributes = Array.from(Object.entries(span.resourceAttributes)).map(
    ([key, value]) => ({ key, value }) satisfies { key: string; value: unknown },
  );

  return (
    <Sheet
      open={props.open}
      onOpenChange={open => {
        if (!open) {
          props.onClose();
        }
      }}
      onOpenChangeComplete={props.onOpenChangeComplete}
      width="half"
      padding="none"
      title={
        <>
          {!span.parentId && 'Root '}Span Details
          <span className="text-neutral-10 ml-2 font-mono font-normal">
            {span.id.substring(0, 4)}
          </span>
          <span className="text-neutral-10 ml-2">{span.name}</span>
        </>
      }
      description={
        <>
          Span ID: <span className="font-mono">{span.id}</span>
          <CopyIconButton value={span.id} label="Copy Span ID" />
        </>
      }
      footer={
        <>
          {span.parentId && (
            <Button
              variant="ghost"
              size="compact"
              render={
                <Link
                  to="/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId"
                  params={{
                    organizationSlug,
                    projectSlug,
                    targetSlug,
                    traceId: props.traceId,
                  }}
                  search={{ activeSpanId: span.parentId }}
                />
              }
            >
              <ArrowUp className="mr-2 size-4" /> Show Parent Span
            </Button>
          )}
          <Button variant="ghost" size="compact" onClick={() => clipboard(window.location.href)}>
            <LinkLucide className="mr-2 size-4" /> Share Link
          </Button>
        </>
      }
    >
      {computedSpanMetrics && (
        <div className="grid grid-cols-2 gap-4 px-6 pb-4 md:grid-cols-4">
          {/* Duration */}
          <div className="flex items-center space-x-2">
            <Clock className="text-info size-4" />
            <div>
              <p className="text-neutral-10 text-xs">Duration</p>
              <p className="text-sm font-medium">
                {' '}
                {formatNanoseconds(computedSpanMetrics.durationNs)}
              </p>
            </div>
          </div>

          {/* Start Time */}
          {computedSpanMetrics.startNs !== 0n && (
            <div className="flex items-center space-x-2">
              <Play className="text-success size-4" />
              <div>
                <p className="text-neutral-10 text-xs">Start</p>
                <p className="text-sm font-medium">
                  {' '}
                  {formatNanoseconds(computedSpanMetrics.startNs)}
                </p>
              </div>
            </div>
          )}

          {/* Percentage of Total */}
          {computedSpanMetrics.percentageOfTotal && (
            <div className="flex items-center space-x-2">
              <PieChart className="text-accent size-4" />
              <div>
                <p className="text-neutral-10 text-xs">% of Total</p>
                <p className="text-sm font-medium"> {computedSpanMetrics.percentageOfTotal}%</p>
              </div>
            </div>
          )}

          {/* Percentage of Parent */}
          {computedSpanMetrics.percentageOfParentSpan && (
            <div className="flex items-center space-x-2">
              <TreePine className="text-accent size-4" />
              <div>
                <p className="text-neutral-10 text-xs">% of Parent</p>
                <p className="text-sm font-medium">
                  {' '}
                  {computedSpanMetrics.percentageOfParentSpan}%
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-neutral-5 border-t">
          <Tabs
            size="sm"
            value={activeView}
            onValueChange={value => setActiveView(value as typeof activeView)}
            items={[
              {
                value: 'span-attributes',
                label: (
                  <CountedLabel
                    label="Span Attributes"
                    count={Object.keys(span.spanAttributes).length}
                  />
                ),
              },
              {
                value: 'resource-attributes',
                label: (
                  <CountedLabel label="Resource Attributes" count={resourceAttributes.length} />
                ),
              },
              {
                value: 'events',
                label: <CountedLabel label="Events" count={span.events.length} />,
              },
              ...((span.spanAttributes['graphql.document'] as string)
                ? [{ value: 'operation', label: 'GraphQL Operation' }]
                : []),
            ]}
          />
        </div>
        <ScrollArea fill>
          {activeView === 'span-attributes' && (
            <div>
              {spanAttributes.length > 0 ? (
                <div>
                  {spanAttributes.map(attribute => (
                    <AttributeRow
                      key={attribute.key}
                      attributeKey={attribute.key}
                      value={String(attribute.value)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <AlertTriangle className="text-neutral-10 mx-auto mb-2 size-6" />
                  <p className="text-neutral-10 text-xs">No span attributes found for this span.</p>
                </div>
              )}
            </div>
          )}
          {activeView === 'resource-attributes' && (
            <div>
              {resourceAttributes.length > 0 ? (
                <div>
                  {resourceAttributes.map(attribute => (
                    <AttributeRow
                      key={attribute.key}
                      attributeKey={attribute.key}
                      value={String(attribute.value)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <AlertTriangle className="text-neutral-10 mx-auto mb-2 size-6" />
                  <p className="text-neutral-10 text-xs">
                    No resource attributes found for this span.
                  </p>
                </div>
              )}
            </div>
          )}
          {activeView === 'events' && (
            <div>
              {span.events.length > 0 ? (
                <div className="px-1 pt-2">
                  {span.events.map((event, index) => {
                    return (
                      <div className="mb-2" key={`${event.name}_${event.date}_${index}`}>
                        <ExceptionTeaser
                          type={(event.attributes['exception.type'] as string | undefined) ?? ''}
                          message={
                            (event.attributes['exception.message'] as string | undefined) ?? ''
                          }
                          stacktrace={
                            (event.attributes['exception.stacktrace'] as string | undefined) ?? ''
                          }
                          name={event.name}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <AlertTriangle className="text-neutral-10 mx-auto mb-2 size-6" />
                  <p className="text-neutral-10 text-xs">No events found for this span.</p>
                </div>
              )}
            </div>
          )}
          {activeView === 'operation' && (
            <GraphQLHighlight
              height="100%"
              options={{
                fontSize: 10,
                minimap: { enabled: false },
              }}
              code={span.spanAttributes['graphql.document'] as string}
            />
          )}
        </ScrollArea>
      </div>
    </Sheet>
  );
}

type AttributeRowProps = {
  attributeKey: string;
  value: string;
};

function AttributeRow(props: AttributeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const actionsNode = (
    <span className="text-neutral-12 ml-auto mr-0 flex">
      <CopyIconButton value={props.value} label="Copy attribute value" />
      <Tooltip
        trigger={
          <Button variant="ghost" size="icon-sm" onClick={() => setIsExpanded(bool => !bool)}>
            {isExpanded ? <ChevronUp size="14" /> : <ChevronDown size="14" />}
          </Button>
        }
        content={isExpanded ? 'Collapse' : 'Expand'}
        disableHoverablePopup
      />
    </span>
  );

  return (
    <div
      key={props.attributeKey}
      className={cn(
        'border-neutral-5 flex items-center justify-between border-b p-3 text-xs last:border-0',
        isExpanded && 'flex-col text-left',
      )}
    >
      <div className={cn('text-neutral-10 flex flex-1 pr-2', isExpanded && 'w-full pr-0')}>
        {props.attributeKey}
        {isExpanded && actionsNode}
      </div>
      <div
        className={cn(
          'text-neutral-12 text-2xs w-full flex-1 pt-2 font-mono',
          !isExpanded && 'overflow-hidden text-ellipsis text-nowrap pt-0',
        )}
      >
        {props.value}
      </div>
      {!isExpanded && actionsNode}
    </div>
  );
}

function ExceptionTeaser(props: {
  name: string;
  message: string;
  stacktrace: string | null;
  type: string;
}) {
  return (
    <div className="border-critical-line bg-critical-tint overflow-hidden rounded-md border">
      <div className="bg-critical-tint-strong flex items-center justify-between px-3 py-2">
        <span className="text-critical font-mono text-xs font-medium">{props.type}</span>
        <Badge content={props.name} variants={{ variant: 'critical', size: 'sm', mono: true }} />
      </div>
      <div className="p-3 text-xs">
        <p className="text-neutral-11">{props.message}</p>
        {props.stacktrace && (
          <div className="bg-neutral-1/50 mt-2 rounded-sm">
            <ScrollArea axis="horizontal">
              <pre className="text-neutral-10 text-2xs p-2 font-mono leading-tight">
                {props.stacktrace}
              </pre>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
