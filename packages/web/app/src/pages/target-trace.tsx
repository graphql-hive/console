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
import { useQuery } from 'urql';
import { GraphQLHighlight } from '@/components/common/GraphQLSDLBlock';
import { LayoutContent } from '@/components/layouts/layout-content';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { Meta } from '@/components/ui/meta';
import { NotFound } from '@/components/ui/not-found/not-found';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Badge } from '@/components/ui/primitives/badge/badge';
import { Button } from '@/components/ui/primitives/button/button';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { Sheet } from '@/components/ui/primitives/overlays/sheet/sheet';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { Skeleton } from '@/components/ui/primitives/skeleton/skeleton';
import { Tabs } from '@/components/ui/primitives/tabs/tabs';
import { QueryError } from '@/components/ui/query-error';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useClipboard, useSlugs } from '@/lib/hooks';
import { carriedRange } from '@/lib/hooks/use-date-range-controller';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { cn } from '@/lib/utils';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useWidthSync, WidthSyncProvider } from './traces/target-traces-width';
import * as styles from './target-trace.css';

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
    <div className={styles.traceViewDiv}>
      <div className={styles.traceViewDiv2}>
        <div className={styles.traceViewDiv3}>
          <div className={styles.traceViewDiv4} style={{ width }}>
            <div className={styles.traceViewDiv5}>
              <div className={styles.traceViewDiv6}>Timeline</div>
              <div className={styles.traceViewDiv7}>Spans and details</div>
            </div>
          </div>
          <div className={styles.traceViewDiv8}>
            <div className={styles.traceViewDiv9}>
              <div className={styles.traceViewDiv10}>{formatMsTimestamp(timestamps[0])}</div>
              <div className={styles.traceViewDiv11} />
              <div className={styles.traceViewDiv12}>{formatMsTimestamp(timestamps[1])}</div>
              <div className={styles.traceViewDiv13} />
              <div className={styles.traceViewDiv14}>{formatMsTimestamp(timestamps[2])}</div>
              <div className={styles.traceViewDiv15} />
              <div className={styles.traceViewDiv16}>{formatMsTimestamp(timestamps[3])}</div>
              <div className={styles.traceViewDiv17} />
              <div className={styles.traceViewDiv18}>{formatMsTimestamp(timestamps[4])}</div>
              <div className={styles.traceViewDiv19} />
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
        <div className={styles.traceViewDiv20}>
          <div className={styles.traceViewDiv21}>
            {props.serviceNames.map(serviceName => (
              <div
                key={serviceName}
                className={styles.traceViewDiv22}
                onMouseEnter={() => setHighlightedServiceName(serviceName)}
                onMouseLeave={() => setHighlightedServiceName(null)}
              >
                <div
                  className={styles.traceViewDiv23}
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
      className={styles.treeIconSvg}
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
            fill={props.isCollapsed ? 'currentColor' : 'var(--color-surface-page)'}
            stroke="currentColor"
          />
          <text
            x={rectLeft + 10}
            y="20"
            style={{ fontSize: 10 }}
            textAnchor="middle"
            fontWeight={props.isCollapsed ? 700 : 500}
            fill={props.isCollapsed ? 'var(--color-fg-inverse)' : 'currentColor'}
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
      className={styles.traceResizeDiv}
      style={{ left: width - 2 }} // Position 2px to the left of the center
      ref={handleRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Invisible wider hit area */}
      <div
        className={cn(
          styles.traceResizeDiv2,
          isDragging ? styles.traceResizeDiv3 : styles.traceResizeDiv4,
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
    <div className={styles.traceTreeDiv} ref={containerRef}>
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
      className={cn(styles.nodeElementDiv)}
      style={{
        left: `min(${props.leftPositionPercentage}%, 100% - 1px)`,
        width: `${props.widthPercentage}%`,
        backgroundColor: props.color,
      }}
    >
      <div
        className={styles.nodeElementDiv2}
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
          styles.spanNodeDiv,
          hasException && styles.spanNodeDiv2,
          highlightedEvent && highlightedEvent.spanId === span.id && styles.spanNodeDiv3,
        )}
      >
        <div className={styles.spanNodeDiv4}>
          <div className={styles.spanNodeDiv5} style={{ width: `${props.leftPanelWidth}px` }}>
            <div className={cn(styles.spanNodeDiv6, canBeCollapsed && styles.spanNodeDiv7)}>
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
                styles.spanNodeDiv8,
                isDimmed ? styles.spanNodeDiv9 : styles.spanNodeDiv10,
              )}
            >
              <span className={styles.spanNodeSpan}>{span.name}</span>
              {hasException && (
                <span className={styles.spanNodeSpan2}>
                  <Badge content="Error" variants={{ variant: 'critical', mono: true }} />
                </span>
              )}
            </div>
            {span.spanAttributes['hive.gateway.upstream.subgraph.name'] ? (
              <div
                className={cn(
                  styles.spanNodeDiv11,
                  isDimmed ? styles.spanNodeDiv12 : styles.spanNodeDiv13,
                )}
              >
                {span.spanAttributes['hive.gateway.upstream.subgraph.name'] as ReactNode}
              </div>
            ) : null}
          </div>
          <div className={styles.spanNodeDiv14}>
            <Tooltip
              disableHoverablePopup
              side="bottom"
              trigger={
                <Link
                  className={cn(styles.spanNodeLink, isDimmed ? styles.spanNodeLink2 : '')}
                  to="/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId"
                  params={{
                    organizationSlug,
                    projectSlug,
                    targetSlug,
                    traceId: props.traceId,
                  }}
                  search={previous => ({ ...carriedRange(previous), activeSpanId: span.id })}
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
                <div className={styles.spanNodeDiv15}>
                  <div className={styles.spanNodeDiv16}>
                    <div className={styles.spanNodeDiv17}>Duration</div>
                    <div className={styles.spanNodeDiv18}>
                      <span>{formatNanoseconds(props.span.durationNs)}</span>
                    </div>

                    <div className={styles.spanNodeDiv19}>Started At</div>
                    <div className={styles.spanNodeDiv20}>
                      {formatNanoseconds(props.span.startNs)}
                    </div>

                    <div className={styles.spanNodeDiv21}>% of Total</div>
                    <div className={styles.spanNodeDiv22}>{props.span.percentageOfTotal}%</div>

                    <div className={styles.spanNodeDiv23}>
                      {/* Timeline visualization */}
                      <div>
                        <div className={styles.spanNodeDiv24}>
                          <div
                            className={styles.spanNodeDiv25}
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
                        <div className={styles.spanNodeDiv26}>% of Parent</div>
                        <div className={styles.spanNodeDiv27}>
                          {props.span.percentageOfParentSpan}%
                        </div>

                        <div className={styles.spanNodeDiv28}>
                          {/* Timeline visualization */}
                          <div>
                            <div className={styles.spanNodeDiv29}>
                              <div
                                className={styles.spanNodeDiv30}
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
                      className={cn(styles.spanNodeLink3)}
                      style={{ left: `${leftPercentage}%` }}
                      to="/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId"
                      params={{
                        organizationSlug,
                        projectSlug,
                        targetSlug,
                        traceId: props.traceId,
                      }}
                      search={previous => ({
                        ...carriedRange(previous),
                        activeSpanId: span.id,
                        activeSpanTab: 'events',
                      })}
                    >
                      <div className={styles.spanNodeDiv31}>
                        <div
                          className={cn(
                            styles.spanNodeDiv32,
                            isError ? styles.spanNodeDiv33 : styles.spanNodeDiv34,
                          )}
                        >
                          <div
                            className={cn(
                              styles.spanNodeDiv35,
                              isError ? styles.spanNodeDiv36 : styles.spanNodeDiv37,
                            )}
                          />
                        </div>
                      </div>
                    </Link>
                  }
                  content={
                    <div className={styles.spanNodeDiv38}>
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
    <div className={styles.traceSheetDiv}>
      <>
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel defaultSize="70%" minSize="20%" maxSize="80%">
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
          <ResizablePanel defaultSize="30%" minSize="10%" maxSize="80%">
            <div className={styles.traceSheetDiv2}>
              <div className={styles.traceSheetDiv3}>
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
                <div className={styles.traceSheetDiv4}>
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
                        <div className={styles.traceSheetDiv5}>
                          <AlertTriangle className={styles.traceSheetAlertTriangle} />
                          <p className={styles.traceSheetP}>No attributes found for this trace</p>
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
                        <div className={styles.traceSheetDiv6}>
                          <AlertTriangle className={styles.traceSheetAlertTriangle2} />
                          <p className={styles.traceSheetP2}>
                            No resource attributes found for this trace
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {activeView === 'events' ? (
                    <div className={styles.traceSheetDiv7}>
                      <div className={styles.traceSheetDiv8}>
                        {!events.length ? (
                          <div className={styles.traceSheetDiv9}>
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
                              search={previous => ({
                                ...carriedRange(previous),
                                activeSpanId: event.spanId,
                                activeSpanTab: 'events',
                              })}
                              onMouseOver={() =>
                                setHighlightedEvent({
                                  spanId: event.spanId,
                                  eventId: event.id,
                                })
                              }
                              onMouseLeave={() => {
                                setHighlightedEvent(null);
                              }}
                              className={styles.traceSheetLink}
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
                    <div className={styles.traceSheetDiv10}>
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
            search: previous => carriedRange(previous),
          })
        }
        traceId={trace.id}
        activeTab={props.activeSpanTab}
      />
    </div>
  );
}

const traceRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId',
);

export const TargetInsightsNewPageContent_TraceQuery = graphql(/* GraphQL */ `
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
  const range = carriedRange(traceRoute.useSearch());
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

  if (result.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
        error={result.error}
        showLogoutButton={false}
      />
    );
  }

  return (
    <div className={styles.targetInsightsNewPageContentDiv}>
      <Meta title={`Trace ${props.traceId}`} />
      <SubPageLayoutHeader
        subPageTitle={
          <span className={styles.targetInsightsNewPageContentSpan}>
            <Link
              to="/$organizationSlug/$projectSlug/$targetSlug/traces"
              params={{
                organizationSlug,
                projectSlug,
                targetSlug,
              }}
              search={range}
            >
              Traces
            </Link>{' '}
            <span className={styles.targetInsightsNewPageContentSpan2}>/</span>{' '}
            {trace ? (
              <>
                {trace.operationName ?? (
                  <span className={styles.targetInsightsNewPageContentSpan3}>{'<unknown>'}</span>
                )}
                <span className={styles.targetInsightsNewPageContentSpan4}>
                  {trace.id.substring(0, 4)}
                </span>
              </>
            ) : (
              <span className={styles.targetInsightsNewPageContentSpan5}>
                <Skeleton variants={{ size: 'lg', width: 'full' }} />
              </span>
            )}
          </span>
        }
        description={
          <>
            <p>
              Trace ID:{' '}
              {trace?.id ? (
                <>
                  <span className={styles.targetInsightsNewPageContentSpan6}> {trace.id}</span>
                  <CopyIconButton value={trace.id} label="Copy Trace ID" />
                </>
              ) : (
                <span className={styles.targetInsightsNewPageContentSpan7}>
                  <Skeleton variants={{ width: 'full' }} />
                </span>
              )}
            </p>
            {trace && (
              <div className={styles.targetInsightsNewPageContentDiv2}>
                <div className={styles.targetInsightsNewPageContentDiv3}>
                  <Clock className={styles.targetInsightsNewPageContentClock} />
                  <span className={styles.targetInsightsNewPageContentSpan8}>
                    {formatNanoseconds(BigInt(trace.duration))}
                  </span>
                </div>
                <Badge
                  content={trace.success ? 'Ok' : 'Error'}
                  variants={{ variant: trace.success ? 'success' : 'critical' }}
                />
                <span className={styles.targetInsightsNewPageContentSpan9}>
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
    <LayoutContent className={styles.targetTracePageLayoutContent}>
      <div className={styles.targetTracePageDiv}>
        <TargetInsightsNewPageContent {...props} />
      </div>
    </LayoutContent>
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
          <span className={styles.spanSheetSpan}>{span.id.substring(0, 4)}</span>
          <span className={styles.spanSheetSpan2}>{span.name}</span>
        </>
      }
      description={
        <>
          Span ID: <span className={styles.spanSheetSpan3}>{span.id}</span>
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
                  search={previous => ({
                    ...carriedRange(previous),
                    activeSpanId: span.parentId ?? undefined,
                  })}
                />
              }
            >
              <ArrowUp className={styles.spanSheetArrowUp} /> Show Parent Span
            </Button>
          )}
          <Button variant="ghost" size="compact" onClick={() => clipboard(window.location.href)}>
            <LinkLucide className={styles.spanSheetLinkLucide} /> Share Link
          </Button>
        </>
      }
    >
      {computedSpanMetrics && (
        <div className={styles.spanSheetDiv}>
          {/* Duration */}
          <div className={styles.spanSheetDiv2}>
            <Clock className={styles.spanSheetClock} />
            <div>
              <p className={styles.spanSheetP}>Duration</p>
              <p className={styles.spanSheetP2}>
                {' '}
                {formatNanoseconds(computedSpanMetrics.durationNs)}
              </p>
            </div>
          </div>

          {/* Start Time */}
          {computedSpanMetrics.startNs !== 0n && (
            <div className={styles.spanSheetDiv3}>
              <Play className={styles.spanSheetPlay} />
              <div>
                <p className={styles.spanSheetP3}>Start</p>
                <p className={styles.spanSheetP4}>
                  {' '}
                  {formatNanoseconds(computedSpanMetrics.startNs)}
                </p>
              </div>
            </div>
          )}

          {/* Percentage of Total */}
          {computedSpanMetrics.percentageOfTotal && (
            <div className={styles.spanSheetDiv4}>
              <PieChart className={styles.spanSheetPieChart} />
              <div>
                <p className={styles.spanSheetP5}>% of Total</p>
                <p className={styles.spanSheetP6}> {computedSpanMetrics.percentageOfTotal}%</p>
              </div>
            </div>
          )}

          {/* Percentage of Parent */}
          {computedSpanMetrics.percentageOfParentSpan && (
            <div className={styles.spanSheetDiv5}>
              <TreePine className={styles.spanSheetTreePine} />
              <div>
                <p className={styles.spanSheetP7}>% of Parent</p>
                <p className={styles.spanSheetP8}> {computedSpanMetrics.percentageOfParentSpan}%</p>
              </div>
            </div>
          )}
        </div>
      )}
      <div className={styles.spanSheetDiv6}>
        <div className={styles.spanSheetDiv7}>
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
                <div className={styles.spanSheetDiv8}>
                  <AlertTriangle className={styles.spanSheetAlertTriangle} />
                  <p className={styles.spanSheetP9}>No span attributes found for this span.</p>
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
                <div className={styles.spanSheetDiv9}>
                  <AlertTriangle className={styles.spanSheetAlertTriangle2} />
                  <p className={styles.spanSheetP10}>No resource attributes found for this span.</p>
                </div>
              )}
            </div>
          )}
          {activeView === 'events' && (
            <div>
              {span.events.length > 0 ? (
                <div className={styles.spanSheetDiv10}>
                  {span.events.map((event, index) => {
                    return (
                      <div
                        className={styles.spanSheetDiv11}
                        key={`${event.name}_${event.date}_${index}`}
                      >
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
                <div className={styles.spanSheetDiv12}>
                  <AlertTriangle className={styles.spanSheetAlertTriangle3} />
                  <p className={styles.spanSheetP11}>No events found for this span.</p>
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
    <span className={styles.attributeRowSpan}>
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
      className={cn(styles.attributeRowDiv, isExpanded && styles.attributeRowDiv2)}
    >
      <div className={cn(styles.attributeRowDiv3, isExpanded && styles.attributeRowDiv4)}>
        {props.attributeKey}
        {isExpanded && actionsNode}
      </div>
      <div className={cn(styles.attributeRowDiv5, !isExpanded && styles.attributeRowDiv6)}>
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
    <div className={styles.exceptionTeaserDiv}>
      <div className={styles.exceptionTeaserDiv2}>
        <span className={styles.exceptionTeaserSpan}>{props.type}</span>
        <Badge content={props.name} variants={{ variant: 'critical', size: 'sm', mono: true }} />
      </div>
      <div className={styles.exceptionTeaserDiv3}>
        <p className={styles.exceptionTeaserP}>{props.message}</p>
        {props.stacktrace && (
          <div className={styles.exceptionTeaserDiv4}>
            <ScrollArea axis="horizontal">
              <pre className={styles.exceptionTeaserPre}>{props.stacktrace}</pre>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
