import { TriangleAlertIcon } from 'lucide-react';
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
  // If it's less than 100%, cap the width so at least 1px of red is always visible
  const fillWidth = scaledPercent < 100 ? `calc(min(${scaledPercent}%, 100% - 1px))` : '100%';
  const showWarning = safePercent < 50;

  return (
    <div
      className={cn(
        'relative flex h-4 w-full items-center overflow-hidden rounded-full bg-red-500',
        className,
      )}
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-green-500 transition-all duration-300 ease-in-out"
        style={{ width: fillWidth }}
      >
        {showWarning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <TriangleAlertIcon className="h-4 w-4 drop-shadow-sm" />
          </div>
        )}
      </div>
    </div>
  );
}
