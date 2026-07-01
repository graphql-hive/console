import { cn } from '@/lib/utils';

export default function AvailabilityBar({
  availability,
  className,
}: {
  availability: number;
  /** Use to set the width and height of the component*/
  className?: string;
}) {
  // Ensure the percentage stays strictly between 0 and 100
  const safePercent = Math.min(Math.max(availability, 0), 100);
  // Scale the width: 50% availability -> 0% visual width, 100% availability -> 100% visual width
  const scaledPercent = Math.max((safePercent - 50) * 2, 0);
  const isLessThan100 = scaledPercent < 100;
  // If it's less than 100%, cap the width so at least 1px of red is always visible
  const fillWidth = isLessThan100 ? `calc(min(${scaledPercent}%, 100% - 1px))` : '100%';

  return (
    <div
      className={cn(
        'relative flex h-2 w-full items-center overflow-hidden rounded-sm bg-red-500',
        className,
      )}
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full bg-green-500 transition-all duration-300 ease-in-out',
          isLessThan100 && 'border-hive-laboratory-background border-r',
        )}
        style={{ width: fillWidth }}
      />
    </div>
  );
}
