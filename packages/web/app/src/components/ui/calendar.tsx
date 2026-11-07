import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type DayButtonProps } from 'react-day-picker';
import { focusRing } from '@/components/ui/primitives/shared-styles';
import { cn } from '@/lib/utils';
import * as styles from './calendar.css';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const navButton = cn(styles.class2, focusRing);

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(styles.calendarDayPicker, className)}
      classNames={{
        months: styles.calendarMonths,
        month: styles.calendarMonth,
        month_caption: styles.calendarMonthCaption,
        caption_label: styles.calendarCaptionLabel,
        // One nav for all months, laid over the caption row with a button at each outer edge.
        nav: styles.calendarNav,
        button_previous: navButton,
        button_next: navButton,
        month_grid: styles.calendarMonthGrid,
        weekdays: styles.calendarWeekdays,
        weekday: styles.calendarWeekday,
        week: styles.calendarWeek,
        // The cell carries aria-selected and the modifiers; the button inside is styled below.
        day: cn(
          styles.calendarDayPicker2,
          props.mode === 'range' ? styles.calendarDayPicker3 : styles.calendarDayPicker4,
        ),
        range_start: styles.calendarRangeStart,
        range_end: styles.calendarRangeEnd,
        outside: styles.calendarOutside,
        disabled: styles.calendarDisabled,
        hidden: styles.calendarHidden,
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className }) =>
          orientation === 'left' ? (
            <ChevronLeft className={cn(styles.calendarChevronLeft, className)} />
          ) : (
            <ChevronRight className={cn(styles.calendarChevronRight, className)} />
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
        styles.calendarDayButtonButton,
        focusRing,
        modifiers.today && styles.calendarDayButtonButton2,
        modifiers.selected && styles.calendarDayButtonButton3,
        modifiers.range_middle && styles.calendarDayButtonButton4,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar };
