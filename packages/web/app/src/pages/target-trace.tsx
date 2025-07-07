import { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Clock,
  CopyIcon,
  Link as LinkLucide,
  PieChart,
  Play,
  TreePine,
} from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useQuery } from 'urql';
import { GraphQLHighlight } from '@/components/common/GraphQLSDLBlock';
import { Page, TargetLayout } from '@/components/layouts/target';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/meta';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useClipboard } from '@/lib/hooks';
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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  traceId: string;
}) {
  const [width] = useWidthSync();
  const [highlightedServiceName, setHighlightedServiceName] = useState<string | null>(null);

  const timestamps = splitNanosecondsToMsIntervals(props.totalTraceDuration);

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
              <div className="absolute left-0 top-6 -translate-x-1/2 text-center">
                {formatMsTimestamp(timestamps[0])}
              </div>
              <div className="absolute bottom-0 left-0 h-2 w-px bg-[#27272a]" />
              <div className="absolute left-[25%] top-6 -translate-x-1/2 text-center">
                {formatMsTimestamp(timestamps[1])}
              </div>
              <div className="absolute bottom-0 left-[25%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
              <div className="absolute left-[50%] top-6 -translate-x-1/2 text-center">
                {formatMsTimestamp(timestamps[2])}
              </div>
              <div className="absolute bottom-0 left-[50%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
              <div className="absolute left-[75%] top-6 -translate-x-1/2 text-center">
                {formatMsTimestamp(timestamps[3])}
              </div>
              <div className="absolute bottom-0 left-[75%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
              <div className="absolute right-0 top-6 translate-x-1/2 text-center">
                {formatMsTimestamp(timestamps[4])}
              </div>
              <div className="absolute bottom-0 right-0 h-2 w-px -translate-x-1/2 bg-[#27272a]" />
            </div>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-grow">
        <div>
          <TraceTree
            leftPanelWidth={width}
            rootSpan={props.rootSpan}
            highlightedServiceName={highlightedServiceName}
            serviceNames={props.serviceNames}
            organizationSlug={props.organizationSlug}
            projectSlug={props.projectSlug}
            targetSlug={props.targetSlug}
            traceId={props.traceId}
          />
        </div>
      </ScrollArea>
      {props.serviceNames && (
        <div className="sticky bottom-0 z-10 px-2 py-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
            {props.serviceNames.map(serviceName => (
              <div
                key={serviceName}
                className="flex cursor-pointer items-center gap-2 hover:text-white"
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
  rootSpan: SpanFragmentWithChildren;
  leftPanelWidth: number;
  serviceNames: Array<string>;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
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
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
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
      className={cn('absolute z-20 block h-6 min-w-[1px] select-none rounded-sm')}
      style={{
        left: `min(${props.leftPositionPercentage}%, 100% - 1px)`,
        width: `${props.widthPercentage}%`,
        backgroundColor: props.color,
      }}
    >
      <div
        className="absolute top-1/2 flex -translate-y-1/2 items-center whitespace-nowrap px-[4px] font-mono leading-none"
        style={{
          fontSize: '11px',
          ...(props.isNearRightEdge ? { right: '6px' } : { left: `calc(100% + 6px)` }),
        }}
      >
        {props.durationStr}
      </div>
    </div>
  );
}

function SpanNode(props: SpanNodeProps) {
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
  const isDimmed =
    typeof props.highlightedServiceName === 'string' &&
    props.highlightedServiceName !== span.spanAttributes['gateway.upstream.subgraph.name'];

  const childrenCount = collapsed
    ? countChildren(props.span.children) + 1
    : props.span.children.length;

  const canBeCollapsed = props.span.children.length > 0;
  const parentColor = props.parentColor ?? props.color;

  return (
    <>
      <div className="pr-8 odd:bg-gray-800/20 hover:bg-gray-900">
        <div className="relative flex h-8 w-full items-center overflow-hidden">
          <div
            className="relative flex h-8 shrink-0 items-center gap-x-2 overflow-hidden pl-1"
            style={{ width: `${props.leftPanelWidth}px` }}
          >
            <div
              className={cn(
                'flex h-8 shrink-0 items-center overflow-hidden overflow-ellipsis whitespace-nowrap text-gray-500',
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
              className={cn('whitespace-nowrap text-xs', isDimmed ? 'text-gray-500' : 'text-white')}
            >
              {span.name}
            </div>
            {span.spanAttributes['gateway.upstream.subgraph.name'] ? (
              <div
                className={cn(
                  'overflow-hidden overflow-ellipsis whitespace-nowrap text-xs',
                  isDimmed ? 'text-gray-600' : 'text-gray-500',
                )}
              >
                {span.spanAttributes['gateway.upstream.subgraph.name']}
              </div>
            ) : null}
          </div>
          <Link
            className={cn(
              'relative flex h-full grow cursor-pointer items-center overflow-hidden',
              isDimmed ? 'opacity-25' : '',
            )}
            to="/$organizationSlug/$projectSlug/$targetSlug/trace/$traceId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              traceId: props.traceId,
            }}
            search={{ activeSpanId: span.id }}
          >
            <Tooltip disableHoverableContent delayDuration={100}>
              <TooltipTrigger asChild>
                <NodeElement
                  color={props.color}
                  isNearRightEdge={isNearRightEdge}
                  leftPositionPercentage={leftPositionPercentage}
                  widthPercentage={widthPercentage}
                  durationStr={formatNanoseconds(props.span.durationNs)}
                />
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
                      <span>{formatNanoseconds(props.span.durationNs)}</span>
                    </div>

                    <div className="text-gray-400">Started At</div>
                    <div className="text-right font-mono">
                      {formatNanoseconds(props.span.startNs)}
                    </div>

                    <div className="text-gray-400">% of Total</div>
                    <div className="text-right font-mono">{props.span.percentageOfTotal}%</div>

                    <div className="col-span-2">
                      {/* Timeline visualization */}
                      <div>
                        <div className="h-[2px] w-full overflow-hidden bg-gray-800">
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
                        <div className="text-gray-400">% of Parent</div>
                        <div className="text-right font-mono">
                          {props.span.percentageOfParentSpan}%
                        </div>

                        <div className="col-span-2">
                          {/* Timeline visualization */}
                          <div>
                            <div className="h-[2px] w-full overflow-hidden bg-gray-800">
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
              </TooltipContent>
            </Tooltip>
          </Link>
        </div>
      </div>
      {collapsed
        ? null
        : props.span.children.length
          ? props.span.children.map((childSpan, i, arr) => {
              const uchildSpan = useFragment(SpanFragment, childSpan.span);

              const serviceName: string | null =
                uchildSpan.spanAttributes['gateway.upstream.subgraph.name'] ??
                props.serviceName ??
                null;

              const isLastChild = i === arr.length - 1;
              return (
                <SpanNode
                  key={span.id}
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
                  organizationSlug={props.organizationSlug}
                  projectSlug={props.projectSlug}
                  targetSlug={props.targetSlug}
                  traceId={props.traceId}
                />
              );
            })
          : null}
    </>
  );
}

// function GridTable(props: {
//   rows: Array<{
//     key: string;
//     value: ReactNode;
//   }>;
// }) {
//   return (
//     <div className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2">
//       {props.rows.map(row => (
//         <Fragment key={row.key}>
//           <div className="font-sans text-gray-400">{row.key}</div>
//           <div className="text-right font-mono">{row.value}</div>
//         </Fragment>
//       ))}
//     </div>
//   );
// }

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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
};

export function TraceSheet(props: TraceSheetProps) {
  const [activeView, setActiveView] = useState<
    'span-attributes' | 'resource-attributes' | 'events' | 'operation'
  >('span-attributes');
  const trace = useFragment(TraceSheet_TraceFragment, props.trace);

  const [rootSpan, spanLookupMap] = useMemo(
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
    from: '/$organizationSlug/$projectSlug/$targetSlug/trace/$traceId',
  });

  return (
    <div className="h-full">
      <TooltipProvider>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={70} minSize={20} maxSize={80}>
            <WidthSyncProvider defaultWidth={251}>
              <TraceView
                rootSpan={rootSpan}
                serviceNames={trace.subgraphs}
                totalTraceDuration={totalTraceDuration}
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                traceId={trace.id}
              />
            </WidthSyncProvider>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={30} minSize={10} maxSize={80}>
            <div className="flex h-full flex-col">
              <div className="sticky top-0 z-10 border-b border-gray-800">
                <div className="item-center flex w-full gap-x-4 px-2 text-xs font-medium">
                  <TabButton
                    isActive={activeView === 'span-attributes'}
                    onClick={() => setActiveView('span-attributes')}
                  >
                    <div className="flex items-center gap-x-2">
                      <div>Attributes</div>
                      <div>
                        <Badge
                          variant="secondary"
                          className="rounded-md px-2 py-0.5 text-[10px] font-thin"
                        >
                          {spanAttributes.length}
                        </Badge>
                      </div>
                    </div>
                  </TabButton>
                  <TabButton
                    isActive={activeView === 'resource-attributes'}
                    onClick={() => setActiveView('resource-attributes')}
                  >
                    <div className="flex items-center gap-x-2">
                      <div>Resource Attributes</div>
                      <div>
                        <Badge
                          variant="secondary"
                          className="rounded-md px-2 py-0.5 text-[10px] font-thin"
                        >
                          {resourceAttributes.length}
                        </Badge>
                      </div>
                    </div>
                  </TabButton>
                  {/* <TabButton
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
                  </TabButton> */}
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
                          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-gray-500" />
                          <p className="text-xs text-gray-500">
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
                          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-gray-500" />
                          <p className="text-xs text-gray-500">
                            No resource attributes found for this trace
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {/* {activeView === 'events' ? (
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
                  ) : null} */}
                  {activeView === 'operation' ? (
                    <div className="absolute bottom-0 top-0 w-full">
                      <GraphQLHighlight
                        height={'100%'}
                        options={{
                          fontSize: 10,
                          minimap: { enabled: false },
                        }}
                        code={rootSpanUnmasked.spanAttributes['hive.graphql.operation.document']}
                      />
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </TooltipProvider>
      {props.activeSpanId && (
        <SpanSheet
          span={trace.spans.find(trace => trace.id === props.activeSpanId) ?? null}
          computedSpanMetrics={spanLookupMap.get(props.activeSpanId) ?? null}
          onClose={() =>
            navigate({
              to: '/$organizationSlug/$projectSlug/$targetSlug/trace/$traceId',
              search: {},
            })
          }
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          targetSlug={props.targetSlug}
          traceId={trace.id}
        />
      )}
    </div>
  );
}

function TargetInsightsNewPageContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  traceId: string;
  activeSpanId: string | null;
}) {
  const [result] = useQuery({
    query: TargetTraceQuery,
    variables: {
      targetSelector: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      },
      traceId: props.traceId,
    },
  });

  if (!result.data?.target?.trace) {
    return null;
  }

  return (
    <TraceSheet
      organizationSlug={props.organizationSlug}
      projectSlug={props.projectSlug}
      targetSlug={props.targetSlug}
      trace={result.data.target.trace}
      activeSpanId={props.activeSpanId}
    />
  );
}

export function TargetTracePage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  traceId: string;
  activeSpanId: string | null;
}) {
  return (
    <>
      <Meta title={`Trace ${props.traceId}`} />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Traces}
        className="flex flex-col"
      >
        <div className="flex flex-1 flex-col">
          <AutoSizer disableWidth>
            {size => (
              <div className="w-full" style={{ height: size.height }}>
                <TargetInsightsNewPageContent {...props} />
              </div>
            )}
          </AutoSizer>
        </div>
      </TargetLayout>
    </>
  );
}

const TargetTraceQuery = graphql(/* GraphQL */ `
  query TargetTraceQuery($targetSelector: TargetSelectorInput!, $traceId: ID!) {
    target(reference: { bySelector: $targetSelector }) {
      id
      trace(traceId: $traceId) {
        ...TraceSheet_TraceFragment
        id
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

const SpanFragment = graphql(/* GraphQL */ `
  fragment SpanFragment on Span {
    id
    name
    spanAttributes
    resourceAttributes
    parentId
    startTime
    endTime
  }
`);

type ComputedSpanMetrics = {
  durationNs: bigint;
  startNs: bigint;
  percentageOfTotal: string;
  percentageOfParentSpan: string | null;
};

type SpanFragmentWithChildren = {
  span: FragmentType<typeof SpanFragment>;
  children: Array<SpanFragmentWithChildren>;
} & ComputedSpanMetrics;

function createSpanTreeStructure(
  fragments: Array<FragmentType<typeof SpanFragment>>,
): [SpanFragmentWithChildren, ReadonlyMap<string, SpanFragmentWithChildren>] {
  const itemsById = new Map</* id */ string, SpanFragmentWithChildren>();
  let root: SpanFragmentWithChildren | null = null;
  for (const fragment of fragments) {
    const ufragment = useFragment(SpanFragment, fragment);

    const fragmentWithChildren: SpanFragmentWithChildren = {
      span: fragment,
      children: [],
      durationNs: differenceInNanoseconds(ufragment.endTime, ufragment.startTime),
      startNs: 0n,
      percentageOfTotal: '',
      percentageOfParentSpan: null,
    };

    itemsById.set(ufragment.id, fragmentWithChildren);
    if (ufragment.parentId == null) {
      root = fragmentWithChildren;
    }
  }

  if (!root) {
    throw new Error('No root found.');
  }

  const uroot = useFragment(SpanFragment, root.span);
  const startNS = parseRFC3339ToEpochNanos(uroot.startTime);

  for (const item of itemsById.values()) {
    const uitem = useFragment(SpanFragment, item.span);
    console.log(uitem.parentId);
    if (!uitem.parentId) {
      continue;
    }
    const parent = itemsById.get(uitem.parentId);
    if (!parent) {
      throw new Error('Missing parent.');
    }

    parent.children.push(item);
    item.startNs = parseRFC3339ToEpochNanos(uitem.startTime) - startNS;
    item.percentageOfTotal = (
      (nanosecondsToMilliseconds(item.durationNs) / nanosecondsToMilliseconds(root.durationNs)) *
      100
    ).toFixed(2);
    item.percentageOfParentSpan = (
      (nanosecondsToMilliseconds(item.durationNs) / nanosecondsToMilliseconds(parent.durationNs)) *
      100
    ).toFixed(2);
  }

  for (const item of itemsById.values()) {
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

  return [root, itemsById as ReadonlyMap<string, SpanFragmentWithChildren>] as const;
}

function formatNanoseconds(nsBigInt: bigint) {
  const TEN_THOUSAND_NS = 10000n;

  if (nsBigInt === 0n) {
    return `0ms`;
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
  const oneMillion = 1000000n;
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
  }
`);

type SpanSheetProps = {
  span: FragmentType<typeof SpanSheet_SpanFragment> | null;
  computedSpanMetrics: ComputedSpanMetrics | null;
  onClose: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  traceId: string;
};

function SpanSheet(props: SpanSheetProps) {
  const span = useFragment(SpanSheet_SpanFragment, props.span);
  const [activeView, setActiveView] = useState<'span-attributes' | 'resource-attributes'>(
    'span-attributes',
  );
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
    <Sheet open={true} onOpenChange={props.onClose}>
      <SheetContent className="flex flex-col border-l border-gray-800 bg-black p-0 text-white md:max-w-[50%]">
        <SheetHeader className="relative border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-medium text-white">
              {!span.parentId && 'Root '}Span Details
              <span className="text-muted-foreground ml-2 font-mono font-normal">
                {span.id.substring(0, 4)}
              </span>
              <span className="text-muted-foreground ml-2">{span.name}</span>
            </SheetTitle>
          </div>
          <SheetDescription className="mt-1 text-xs text-gray-400">
            Span ID: <span className="font-mono">{span.id}</span>
            <CopyIconButton value={span.id} label="Copy Span ID" />
          </SheetDescription>
          {props.computedSpanMetrics && (
            <div className="grid grid-cols-2 gap-4 pt-3 md:grid-cols-4">
              {/* Duration */}
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-muted-foreground text-xs">Duration</p>
                  <p className="text-sm font-medium">
                    {' '}
                    {formatNanoseconds(props.computedSpanMetrics.durationNs)}
                  </p>
                </div>
              </div>

              {/* Start Time */}
              {props.computedSpanMetrics.startNs !== 0n && (
                <div className="flex items-center space-x-2">
                  <Play className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-muted-foreground text-xs">Start</p>
                    <p className="text-sm font-medium">
                      {' '}
                      {formatNanoseconds(props.computedSpanMetrics.startNs)}
                    </p>
                  </div>
                </div>
              )}

              {/* Percentage of Total */}
              {props.computedSpanMetrics.percentageOfTotal && (
                <div className="flex items-center space-x-2">
                  <PieChart className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-muted-foreground text-xs">% of Total</p>
                    <p className="text-sm font-medium">
                      {' '}
                      {props.computedSpanMetrics.percentageOfTotal}%
                    </p>
                  </div>
                </div>
              )}

              {/* Percentage of Parent */}
              {props.computedSpanMetrics.percentageOfParentSpan && (
                <div className="flex items-center space-x-2">
                  <TreePine className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-muted-foreground text-xs">% of Parent</p>
                    <p className="text-sm font-medium">
                      {' '}
                      {props.computedSpanMetrics.percentageOfParentSpan}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetHeader>
        <div className="overflow-hidden">
          <div className="flex h-full flex-col">
            <div className="sticky top-0 z-10 border-b border-gray-800">
              <div className="item-center flex w-full gap-x-4 px-2 text-xs font-medium">
                <TabButton
                  isActive={activeView === 'span-attributes'}
                  onClick={() => setActiveView('span-attributes')}
                >
                  <div className="flex items-center gap-x-2">
                    <div>Span Attributes</div>
                    <div>
                      <Badge
                        variant="secondary"
                        className="rounded-md px-2 py-0.5 text-[10px] font-thin"
                      >
                        {Array.from(Object.keys(span.spanAttributes)).length}
                      </Badge>
                    </div>
                  </div>
                </TabButton>
                <TabButton
                  isActive={activeView === 'resource-attributes'}
                  onClick={() => setActiveView('resource-attributes')}
                >
                  <div className="flex items-center gap-x-2">
                    <div>Resource Attributes</div>
                    <div>
                      <Badge
                        variant="secondary"
                        className="rounded-md px-2 py-0.5 text-[10px] font-thin"
                      >
                        {resourceAttributes.length}
                      </Badge>
                    </div>
                  </div>
                </TabButton>
              </div>
            </div>
            <div className="overflow-y-scroll">
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
                      <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-gray-500" />
                      <p className="text-xs text-gray-500">
                        No span attributes found for this span.
                      </p>
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
                      <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-gray-500" />
                      <p className="text-xs text-gray-500">
                        No resource attributes found for this span.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <SheetFooter className="mt-auto border-t p-2">
          {span.parentId && (
            <Button variant="ghost" size="sm" asChild>
              <Link
                to="/$organizationSlug/$projectSlug/$targetSlug/trace/$traceId"
                params={{
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                  traceId: props.traceId,
                }}
                search={{ activeSpanId: span.parentId }}
              >
                <ArrowUp className="mr-2 h-4 w-4" /> Show Parent Span
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => clipboard(window.location.href)}>
            <LinkLucide className="mr-2 h-4 w-4" /> Share Link
          </Button>
        </SheetFooter>
      </SheetContent>
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
    <span className="ml-auto mr-0 flex text-white">
      <CopyIconButton value={props.value} label="Copy attribute value" />
      <TooltipProvider>
        <Tooltip delayDuration={0} disableHoverableContent>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" onClick={() => setIsExpanded(bool => !bool)}>
              {isExpanded ? <ChevronUp size="14" /> : <ChevronDown size="14" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{isExpanded ? 'Collapse' : 'Expand'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );

  return (
    <div
      key={props.attributeKey}
      className={cn(
        'border-border flex items-center justify-between border-b px-3 py-3 text-xs last:border-0',
        isExpanded && 'flex-col text-left',
      )}
    >
      <div className={cn('flex flex-1 pr-2 text-gray-400', isExpanded && 'w-full pr-0')}>
        {props.attributeKey}
        {isExpanded && actionsNode}
      </div>
      <div
        className={cn(
          'w-full flex-1 pt-2 font-mono text-white',
          !isExpanded && 'overflow-hidden text-ellipsis text-nowrap pt-0',
        )}
      >
        {props.value}
      </div>
      {!isExpanded && actionsNode}
    </div>
  );
}

type CopyIconButtonProps = {
  label: string;
  value: string;
};

export function CopyIconButton(props: CopyIconButtonProps) {
  const clipboard = useClipboard();
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0} disableHoverableContent>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => clipboard(props.value)}
            className="ml-auto"
          >
            <CopyIcon size="10" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{props.label}</TooltipContent>
      </Tooltip>{' '}
    </TooltipProvider>
  );
}
