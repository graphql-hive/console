import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { focusRing } from '@/components/base/shared-styles';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          'border-line inline-flex size-7 items-center justify-center rounded-sm border bg-transparent opacity-50 transition-opacity hover:opacity-100',
          focusRing,
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-fg-secondary rounded-md w-8 font-normal text-control',
        row: 'flex w-full mt-2',
        cell: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-neutral-2 [&:has([aria-selected].day-outside)]:bg-neutral-2/50 [&:has([aria-selected].day-range-end)]:rounded-r-md',
          props.mode === 'range'
            ? '[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
            : '[&:has([aria-selected])]:rounded-md',
        ),
        day: cn(
          'text-fg-default hover:text-fg inline-flex size-8 items-center justify-center rounded-sm text-sm font-normal transition-colors aria-selected:opacity-100',
          focusRing,
        ),
        day_range_start: 'day-range-start',
        day_range_end: 'day-range-end',
        day_selected:
          'bg-neutral-11 text-neutral-2 hover:bg-neutral-11 hover:text-neutral-2 focus:bg-neutral-11 focus:text-neutral-2',
        day_today: 'bg-neutral-2 text-fg',
        day_outside:
          'day-outside text-fg-secondary opacity-50  aria-selected:bg-neutral-2/50 aria-selected:text-fg-secondary aria-selected:opacity-30',
        day_disabled: 'text-fg-secondary opacity-50',
        day_range_middle: 'aria-selected:bg-neutral-2 aria-selected:text-fg',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="size-4" />,
        IconRight: () => <ChevronRight className="size-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
