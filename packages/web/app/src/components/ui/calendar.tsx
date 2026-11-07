import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type DayButtonProps } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { calendarStyles } from './calendar.css';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(calendarStyles.root, className)}
      classNames={{
        months: calendarStyles.months,
        month: calendarStyles.month,
        month_caption: calendarStyles.monthCaption,
        caption_label: calendarStyles.captionLabel,
        nav: calendarStyles.nav,
        button_previous: calendarStyles.navButton,
        button_next: calendarStyles.navButton,
        month_grid: calendarStyles.monthGrid,
        weekdays: calendarStyles.weekdays,
        weekday: calendarStyles.weekday,
        week: calendarStyles.week,
        day: calendarStyles.day({ mode: props.mode === 'range' ? 'range' : 'single' }),
        range_start: calendarStyles.rangeStart,
        range_end: calendarStyles.rangeEnd,
        outside: calendarStyles.outside,
        disabled: calendarStyles.disabled,
        hidden: calendarStyles.hidden,
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className }) =>
          orientation === 'left' ? (
            <ChevronLeft className={cn(calendarStyles.chevron, className)} />
          ) : (
            <ChevronRight className={cn(calendarStyles.chevron, className)} />
          ),
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

function CalendarDayButton({ day: _day, modifiers, className, ...props }: DayButtonProps) {
  return (
    <button
      className={cn(
        calendarStyles.dayButton({
          today: modifiers.today,
          selected: modifiers.selected,
          rangeMiddle: modifiers.range_middle,
        }),
        className,
      )}
      {...props}
    />
  );
}

export { Calendar };
