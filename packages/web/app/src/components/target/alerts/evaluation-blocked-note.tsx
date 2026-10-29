import { Info } from 'lucide-react';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { TimeAgo } from '@/components/ui/time-ago';

/**
 * Marks a rule the evaluator is skipping because its saved filter cannot be resolved. The words
 * are the signal; the sentence that says what to fix, and how long this has been going on, sit
 * behind the icon so a list row and a panel row stay one line.
 */
export function EvaluationBlockedNote({ since, message }: { since: string; message: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-warning-text">
      Not evaluated
      <Tooltip
        trigger={
          <button
            type="button"
            aria-label="Why this rule is not evaluated"
            className="inline-flex text-warning-text"
            // The row opens the rule; a click on the icon only means the tooltip.
            onClick={event => event.stopPropagation()}
          >
            <Info className="size-3" />
          </button>
        }
        content={
          <span className="flex flex-col gap-1">
            <span>{message}</span>
            <span className="text-fg-secondary">
              Since <TimeAgo date={since} />
            </span>
          </span>
        }
      />
    </span>
  );
}
