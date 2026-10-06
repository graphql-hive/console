import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type DayButtonProps } from 'react-day-picker';
import { focusRing } from '@/components/ui/primitives/shared-styles';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const navButton = cn(
  'border-line inline-flex size-7 items-center justify-center rounded-sm border bg-transparent opacity-50 transition-opacity hover:opacity-100',
  focusRing,
);

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        month_caption: 'flex h-7 items-center justify-center',
        caption_label: 'text-sm font-medium',
        // One nav for all months, laid over the caption row with a button at each outer edge.
        nav: 'absolute inset-x-1 top-0 z-10 flex items-center justify-between',
        button_previous: navButton,
        button_next: navButton,
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday: 'text-fg-secondary rounded-md w-8 font-normal text-control',
        week: 'flex w-full mt-2',
        // The cell carries aria-selected and the modifiers; the button inside is styled below.
        day: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 aria-selected:bg-surface-selected',
          props.mode === 'range'
            ? 'first:aria-selected:rounded-l-md last:aria-selected:rounded-r-md'
            : 'aria-selected:rounded-md',
        ),
        range_start: 'rounded-l-md',
        range_end: 'rounded-r-md',
        outside:
          'text-fg-secondary opacity-50 aria-selected:bg-surface-stripe aria-selected:opacity-30',
        disabled: 'text-fg-secondary opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className }) =>
          orientation === 'left' ? (
            <ChevronLeft className={cn('size-4', className)} />
          ) : (
            <ChevronRight className={cn('size-4', className)} />
          ),
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

// Later entries win in cn(), so a range endpoint beats today and a range middle beats the endpoint
// look, the same precedence the v8 class map had.
function CalendarDayButton({ day: _day, modifiers, className, ...props }: DayButtonProps) {
  return (
    <button
      className={cn(
        'text-fg-default hover:text-fg inline-flex size-8 items-center justify-center rounded-sm text-sm font-normal transition-colors',
        focusRing,
        modifiers.today && 'bg-surface-hover text-fg',
        modifiers.selected &&
          'bg-surface-inverse text-fg-inverse hover:bg-surface-inverse hover:text-fg-inverse focus:bg-surface-inverse focus:text-fg-inverse',
        modifiers.range_middle && 'bg-surface-selected text-fg',
        className,
      )}
      {...props}
    />
  );
}

export { Calendar };
