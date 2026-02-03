import { ReactElement } from 'react';
import { FragmentType, graphql, useFragment } from '@/gql';
import { getDocsUrl } from '@/lib/docs-url';
import { useToggle } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { GetStartedWizard } from './wizard';

const GetStartedWizard_GetStartedProgress = graphql(`
  fragment GetStartedWizard_GetStartedProgress on OrganizationGetStarted {
    creatingProject
    publishingSchema
    checkingSchema
    invitingMembers
    reportingOperations
    enablingUsageBasedBreakingChanges
  }
`);

export function GetStartedProgress(props: {
  tasks: FragmentType<typeof GetStartedWizard_GetStartedProgress>;
  className?: string;
}): ReactElement | null {
  const [isOpen, toggle] = useToggle();
  const tasks = useFragment(GetStartedWizard_GetStartedProgress, props.tasks);

  if (!tasks) {
    return null;
  }

  const values = Object.values(tasks).filter(v => typeof v === 'boolean');
  const total = values.length;
  const completed = values.filter(t => t === true).length;
  const remaining = total - completed;

  if (remaining === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={toggle}
        className={cn(
          'cursor-pointer rounded-sm px-4 py-2 text-left hover:opacity-80',
          props.className,
        )}
      >
        <div className="text-neutral-11 text-sm font-medium">Get Started</div>
        <div className="text-neutral-10 text-xs">
          {remaining} remaining task{remaining > 1 ? 's' : ''}
        </div>
        <div>
          <div className="bg-accent_30 relative mt-1 h-[5px] w-full overflow-hidden rounded-sm">
            <div
              className="bg-accent_80 h-full"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      </button>
      <GetStartedWizard isOpen={isOpen} onClose={toggle} tasks={tasks} docsUrl={getDocsUrl} />
    </>
  );
}
