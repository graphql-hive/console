import type { ReactNode } from 'react';
import { format } from 'date-fns';
import {
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Info,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

/** One destination a cell can send the reader to. */
export type DataTableLinkTarget = { label: string; href: string };

export type DataTableCellProps =
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
      /** Written before the time: "created", "last used". */
      prefix?: string;
      tone?: 'default' | 'muted';
      mono?: boolean;
    }
  | {
      kind: 'link';
      label: ReactNode;
      href: string;
      tone?: 'default' | 'accent';
      mono?: boolean;
      external?: boolean;
    }
  | {
      /**
       * A value that leads elsewhere without being the link itself: the label stays text and an
       * icon after it goes to the target. Several targets become a menu on a chevron trigger.
       */
      kind: 'link-out';
      label: ReactNode;
      targets: DataTableLinkTarget[];
      /** Shown on the icon: "Open in Insights". */
      tooltip: string;
      mono?: boolean;
    }
  | { kind: 'badge'; items: BadgeItem | BadgeItem[] }
  | { kind: 'status'; label: ReactNode; dot: StatusColor }
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

/**
 * What a table cell holds, by kind. Column layout (alignment, width, responsive hiding) is the
 * column's, set in its `meta`; this is only the content.
 */
export function DataTableCell(props: DataTableCellProps) {
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
    case 'link':
      return (
        <a
          href={props.href}
          target={props.external ? '_blank' : undefined}
          rel={props.external ? 'noreferrer' : undefined}
          className={cn(linkTone[props.tone ?? 'default'], props.mono && 'font-mono text-xs')}
        >
          {props.label}
        </a>
      );
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
                <a
                  href={props.targets[0].href}
                  aria-label={props.tooltip}
                  className="text-neutral-9 hover:text-neutral-12 inline-flex"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              }
              content={props.tooltip}
            />
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5">
          {label}
          <Menu
            align="start"
            width="sm"
            trigger={
              <button
                type="button"
                aria-label={props.tooltip}
                className="text-neutral-9 hover:text-neutral-12 inline-flex items-center"
              >
                <ExternalLink className="size-3.5" />
                <ChevronDown className="size-3" />
              </button>
            }
            sections={[
              {
                label: props.tooltip,
                items: props.targets.map(target => ({
                  kind: 'link' as const,
                  label: target.label,
                  href: target.href,
                })),
              },
            ]}
          />
        </span>
      );
    }
    case 'badge': {
      const items = Array.isArray(props.items) ? props.items : [props.items];
      return (
        <span className="inline-flex flex-wrap gap-1">
          {items.map(item => (
            <Badge key={item.content} content={item.content} variants={{ variant: item.variant }} />
          ))}
        </span>
      );
    }
    case 'status': {
      if ('dot' in props) {
        return (
          <span className="text-neutral-12 inline-flex items-center gap-1.5">
            <StatusDot color={props.dot} />
            {props.label}
          </span>
        );
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
    case 'checkbox':
      return (
        <Checkbox
          checked={props.checked}
          onCheckedChange={checked => props.onCheckedChange(checked === true)}
          aria-label={props.label}
        />
      );
    case 'actions':
      return (
        <span className="flex justify-end">
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
        <span className="flex justify-end">
          <Button
            layout="iconOnly"
            icon={props.icon}
            aria-label={props.label}
            variant={props.destructive ? 'destructive' : 'ghost'}
            size="compact"
            onClick={props.onClick}
          />
        </span>
      );
    case 'bar': {
      const segments = 10;
      const filled = props.max > 0 ? Math.round((props.value / props.max) * segments) : 0;
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
