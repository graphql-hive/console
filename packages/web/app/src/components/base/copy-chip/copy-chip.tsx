import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyChip(props: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cleanPendingTimer() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
  }

  useEffect(() => cleanPendingTimer, []);

  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(props.value);
        setCopied(true);
        cleanPendingTimer();
        timeoutRef.current = setTimeout(() => setCopied(false), 1200);
      }}
      className="group inline-flex items-center gap-1.5 rounded-md text-xs"
    >
      <span className="truncate">{props.label ?? props.value}</span>
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}
