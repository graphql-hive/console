import type { ReactNode } from 'react';
import { format } from 'date-fns';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Info,
  MoreHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useNavigate, type LinkOptions, type RegisteredRouter } from '@tanstack/react-router';
import { Avatar } from '../avatar/avatar';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { Checkbox } from '../checkbox/checkbox';
import { CopyChip } from '../copy-chip/copy-chip';
import { Menu } from '../floating/menu/menu';
import { Tooltip } from '../floating/tooltip/tooltip';
import { StatusDot } from '../status-dot/status-dot';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'critical'
  | 'info';
type StatusColor = 'success' | 'warning' | 'critical' | 'info' | 'neutral';

type BadgeItem = { content: string; variant?: BadgeVariant };
type MenuSections = NonNullable<React.ComponentProps<typeof Menu>['sections']>;

/** A route through the router: `to`, `params`, `search` and `hash` as TanStack's Link takes them. */
export type DataTableRoute<TTo extends string> = LinkOptions<RegisteredRouter, '/', TTo>;

/** Where a cell sends the reader: a route, or a plain href for anything outside the router. */
export type DataTableDestination<TTo extends string> =
  | { link: DataTableRoute<TTo>; href?: never; external?: never }
  | { href: string; external?: boolean; link?: never };

/** One destination a cell can send the reader to. */
export type DataTableLinkTarget<TTo extends string> = { label: string } & DataTableDestination<TTo>;

export type DataTableCellProps<TTo extends string = '.'> =
  | {
      kind: 'text';
      value: ReactNode;
      weight?: 'regular' | 'medium';
      tone?: 'default' | 'muted';
      mono?: boolean;
      /** Cut the value at the column width with an ellipsis. */
      truncate?: boolean;
      /** A muted aside after the value, such as "(unlimited seats)". */
      secondary?: ReactNode;
      /** Something after the value that qualifies it: a badge, an icon with a tooltip. */
      trailing?: ReactNode;
    }
  | {
      kind: 'number';
      value: number | string;
      /** How a number is written; a string is shown as given. */
      format?: 'count' | 'percent' | 'currency';
    }
  | {
      kind: 'time';
      date: string | number | Date;
      /** `relative-info` is the relative time with the absolute one behind an info icon. */
      mode?: 'relative' | 'absolute' | 'relative-info';
      /**
       * Written before the time, for a headerless list where nothing else says what the time is:
       * "created 3w ago", "last used 1d ago". Under a header it only repeats the header.
       */
      prefix?: string;
      tone?: 'default' | 'muted';
      mono?: boolean;
    }
  | ({
      kind: 'link';
      label: ReactNode;
      tone?: 'default' | 'accent';
      mono?: boolean;
      /** Cut the label at the column width with an ellipsis; the full label sits in the title. */
      truncate?: boolean;
      /** Something after the link that qualifies it: a badge, an icon with a tooltip. */
      trailing?: ReactNode;
    } & DataTableDestination<TTo>)
  | {
      /**
       * A value that leads elsewhere without being the link itself: the label stays text and an
       * icon after it goes to the target. Several targets become a menu on a chevron trigger.
       */
      kind: 'link-out';
      label: ReactNode;
      targets: DataTableLinkTarget<TTo>[];
      /** Shown on the icon: "Open in Insights". */
      tooltip: string;
      mono?: boolean;
    }
  | {
      kind: 'badge';
      items: BadgeItem | BadgeItem[];
      /** How many badges show on the row; the rest collapse into a "+N" badge that lists them. */
      max?: number;
    }
  /** A yes or no as a check or a cross, for a flag column. */
  | { kind: 'boolean'; value: boolean }
  | { kind: 'status'; label: ReactNode; dot: StatusColor; tooltip?: string }
  | {
      kind: 'status';
      label: ReactNode;
      icon: LucideIcon;
      iconTone?: StatusColor;
      /** Explains the state, such as "The domain ownership challenge has not been completed." */
      tooltip?: string;
    }
  | { kind: 'status'; from: BadgeItem; to: BadgeItem }
  | { kind: 'avatar'; name: string; src?: string | null }
  | { kind: 'copy'; value: string }
  | {
      kind: 'checkbox';
      checked: boolean;
      onCheckedChange: (checked: boolean) => void;
      /** Names the row for assistive tech: "Select Team Slack". */
      label: string;
    }
  | {
      kind: 'actions';
      /** Menu sections, as Menu takes them. */
      sections: MenuSections;
      label?: string;
    }
  | {
      kind: 'icon-button';
      icon: LucideIcon;
      label: string;
      onClick: () => void;
      destructive?: boolean;
    }
  | { kind: 'bar'; value: number; max: number }
  | { kind: 'placeholder' };

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

/** "now", "5m ago", "3h ago", "12d ago", "2w ago", "4mo ago", "2y ago". */
export function formatRelative(date: Date, now = Date.now()): string {
  const d = (now - date.getTime()) / 1000;
  if (d < MINUTE * 2) return 'now';
  if (d < HOUR) return `${Math.floor(d / MINUTE)}m ago`;
  if (d < DAY) return `${Math.floor(d / HOUR)}h ago`;
  if (d < WEEK) return `${Math.floor(d / DAY)}d ago`;
  if (d < MONTH) return `${Math.floor(d / WEEK)}w ago`;
  if (d < YEAR) return `${Math.floor(d / MONTH)}mo ago`;
  return `${Math.floor(d / YEAR)}y ago`;
}

export function formatAbsolute(date: Date): string {
  return format(date, 'MMM d, yyyy HH:mm');
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatNumber(value: number | string, kind: 'count' | 'percent' | 'currency' | undefined) {
  if (typeof value === 'string') return value;
  if (kind === 'currency') return currency.format(value);
  if (kind === 'percent') return `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
  return value.toLocaleString('en-US');
}

const tone = { default: 'text-neutral-12', muted: 'text-neutral-10' } as const;
const linkTone = {
  default: 'text-neutral-11 hover:text-neutral-12 hover:underline underline-offset-2',
  accent: 'text-accent_80 hover:text-accent hover:underline underline-offset-2',
} as const;

const statusIconTone: Record<StatusColor, string> = {
  success: 'text-success',
  warning: 'text-warning',
  critical: 'text-critical',
  info: 'text-info',
  neutral: 'text-neutral-10',
};

function Destination<TTo extends string>({
  destination,
  className,
  children,
  title,
  'aria-label': ariaLabel,
}: {
  destination: DataTableDestination<TTo>;
  className: string;
  children: ReactNode;
  title?: string;
  'aria-label'?: string;
}) {
  if (destination.link) {
    return (
      // TanStack resolves the route generics at the call site, where `DataTableRoute<TTo>` is
      // checked in full; inside the component TTo is opaque and no Link overload matches, the
      // same situation ui/link sits in.
      // @ts-expect-error see above
      <Link {...destination.link} className={className} title={title} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={destination.href}
      target={destination.external ? '_blank' : undefined}
      rel={destination.external ? 'noreferrer' : undefined}
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

/** Its own component so the router hook only runs where several targets need a menu. */
function LinkOutMenu<TTo extends string>({
  targets,
  tooltip,
}: {
  targets: DataTableLinkTarget<TTo>[];
  tooltip: string;
}) {
  const navigate = useNavigate();
  return (
    <Menu
      align="start"
      width="sm"
      trigger={
        <button
          type="button"
          aria-label={tooltip}
          className="text-neutral-9 hover:text-neutral-12 inline-flex items-center"
        >
          <ExternalLink className="size-3.5" />
          <ChevronDown className="size-3" />
        </button>
      }
      sections={[
        {
          label: tooltip,
          items: targets.map(target =>
            target.link
              ? {
                  label: target.label,
                  // Same opaque-generic situation as in Destination above.
                  // @ts-expect-error see Destination
                  onClick: () => void navigate(target.link),
                }
              : {
                  kind: 'link' as const,
                  label: target.label,
                  href: target.href,
                  external: target.external,
                },
          ),
        },
      ]}
    />
  );
}

/**
 * What a table cell holds, by kind. Column layout (alignment, width, responsive hiding) is the
 * column's, set in its `meta`; this is only the content.
 */
export function DataTableCell<TTo extends string = '.'>(props: DataTableCellProps<TTo>) {
  switch (props.kind) {
    case 'text': {
      const value = (
        <span
          className={cn(
            tone[props.tone ?? 'default'],
            props.weight === 'medium' && 'font-medium',
            props.mono && 'font-mono text-xs',
            props.truncate && 'block truncate',
          )}
          title={props.truncate && typeof props.value === 'string' ? props.value : undefined}
        >
          {props.value}
          {props.secondary != null ? (
            <span className="text-neutral-10"> {props.secondary}</span>
          ) : null}
        </span>
      );
      if (!props.trailing) return value;
      return (
        <span className="inline-flex items-center gap-2">
          {value}
          {props.trailing}
        </span>
      );
    }
    case 'number':
      return (
        <span className="text-neutral-12 block text-right tabular-nums">
          {formatNumber(props.value, props.format)}
        </span>
      );
    case 'time': {
      const date = new Date(props.date);
      const mode = props.mode ?? 'relative';
      const text = mode === 'absolute' ? formatAbsolute(date) : formatRelative(date);
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1',
            tone[props.tone ?? 'default'],
            props.mono && 'font-mono text-xs',
          )}
        >
          {props.prefix ? <span className="text-neutral-10">{props.prefix}</span> : null}
          <time
            dateTime={date.toISOString()}
            title={mode === 'absolute' ? undefined : formatAbsolute(date)}
          >
            {text}
          </time>
          {mode === 'relative-info' ? (
            <Tooltip
              trigger={
                <span className="text-neutral-9 inline-flex">
                  <Info className="size-3.5" />
                </span>
              }
              content={formatAbsolute(date)}
            />
          ) : null}
        </span>
      );
    }
    case 'link': {
      const link = (
        <Destination
          destination={props}
          className={cn(
            linkTone[props.tone ?? 'default'],
            props.mono && 'font-mono text-xs',
            props.truncate && 'block min-w-0 truncate',
          )}
          title={props.truncate && typeof props.label === 'string' ? props.label : undefined}
        >
          {props.label}
        </Destination>
      );
      if (!props.trailing) return link;
      return (
        <span className="flex items-center gap-2">
          {link}
          {props.trailing}
        </span>
      );
    }
    case 'link-out': {
      const label = (
        <span className={cn('text-neutral-12', props.mono && 'font-mono text-xs')}>
          {props.label}
        </span>
      );
      if (props.targets.length === 1) {
        return (
          <span className="inline-flex items-center gap-1.5">
            {label}
            <Tooltip
              trigger={
                <Destination
                  destination={props.targets[0]}
                  aria-label={props.tooltip}
                  className="text-neutral-9 hover:text-neutral-12 inline-flex"
                >
                  <ExternalLink className="size-3.5" />
                </Destination>
              }
              content={props.tooltip}
            />
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5">
          {label}
          <LinkOutMenu targets={props.targets} tooltip={props.tooltip} />
        </span>
      );
    }
    case 'badge': {
      const items = Array.isArray(props.items) ? props.items : [props.items];
      const shown = items.slice(0, props.max ?? 3);
      const rest = items.slice(shown.length);
      return (
        <span className="inline-flex items-center gap-1">
          {shown.map(item => (
            <Badge key={item.content} content={item.content} variants={{ variant: item.variant }} />
          ))}
          {rest.length > 0 ? (
            <Tooltip
              trigger={
                <span className="inline-flex">
                  <Badge content={`+${rest.length}`} variants={{ variant: 'outline' }} />
                </span>
              }
              content={rest.map(item => item.content).join(', ')}
            />
          ) : null}
        </span>
      );
    }
    case 'boolean':
      return props.value ? (
        <Check className="text-success inline size-4" aria-label="Yes" />
      ) : (
        <X className="text-neutral-9 inline size-4" aria-label="No" />
      );
    case 'status': {
      if ('dot' in props) {
        const body = (
          <span className="text-neutral-12 inline-flex items-center gap-1.5">
            <StatusDot color={props.dot} />
            {props.label}
          </span>
        );
        return props.tooltip ? <Tooltip trigger={body} content={props.tooltip} /> : body;
      }
      if ('icon' in props) {
        const Icon = props.icon;
        const body = (
          <span className="text-neutral-12 inline-flex items-center gap-1.5">
            {props.label}
            <Icon className={cn('size-3.5', statusIconTone[props.iconTone ?? 'neutral'])} />
          </span>
        );
        return props.tooltip ? <Tooltip trigger={body} content={props.tooltip} /> : body;
      }
      return (
        <span className="text-neutral-11 inline-flex items-center gap-2">
          <Badge content={props.from.content} variants={{ variant: props.from.variant }} />
          <ArrowRight className="text-neutral-8 size-3.5" />
          <Badge content={props.to.content} variants={{ variant: props.to.variant }} />
        </span>
      );
    }
    case 'avatar':
      return (
        <span className="text-neutral-12 inline-flex items-center gap-2">
          <Avatar size="xs" alt={props.name} src={props.src} />
          {props.name}
        </span>
      );
    case 'copy':
      return <CopyChip value={props.value} />;
    // Controls inside a clickable or expandable row act on their own: the click stops here.
    case 'checkbox':
      return (
        <span className="inline-flex" onClick={event => event.stopPropagation()}>
          <Checkbox
            checked={props.checked}
            onCheckedChange={checked => props.onCheckedChange(checked === true)}
            aria-label={props.label}
          />
        </span>
      );
    case 'actions':
      return (
        <span className="flex justify-end" onClick={event => event.stopPropagation()}>
          <Menu
            align="end"
            width="sm"
            trigger={
              <Button
                layout="iconOnly"
                icon={MoreHorizontal}
                aria-label={props.label ?? 'Actions'}
                variant="ghost"
                size="compact"
              />
            }
            sections={props.sections}
          />
        </span>
      );
    case 'icon-button':
      return (
        <span className="flex justify-end" onClick={event => event.stopPropagation()}>
          <Tooltip
            trigger={
              <Button
                layout="iconOnly"
                icon={props.icon}
                aria-label={props.label}
                variant={props.destructive ? 'destructive' : 'ghost'}
                size="compact"
                onClick={props.onClick}
              />
            }
            content={props.label}
          />
        </span>
      );
    case 'bar': {
      const segments = 10;
      // Any share at all lights one segment, so a long tail of tiny values still reads as present.
      const filled =
        props.max > 0 && props.value > 0
          ? Math.max(1, Math.round((props.value / props.max) * segments))
          : 0;
      return (
        <span
          className="flex justify-end gap-1"
          role="meter"
          aria-valuenow={props.value}
          aria-valuemin={0}
          aria-valuemax={props.max}
        >
          {Array.from({ length: segments }, (_, i) => (
            <span key={i} className={cn('h-4 w-1', i < filled ? 'bg-success' : 'bg-neutral-6')} />
          ))}
        </span>
      );
    }
    case 'placeholder':
      return <span className="text-neutral-10">—</span>;
  }
}
