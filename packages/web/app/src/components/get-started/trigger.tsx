import { ReactElement } from 'react';
import { FragmentType, graphql, useFragment } from '@/gql';
import { getDocsUrl } from '@/lib/docs-url';
import { useToggle } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { GetStartedWizard } from './wizard';
import { getStartedTriggerStyles } from './trigger.css';

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
      <button onClick={toggle} className={cn(getStartedTriggerStyles.root, props.className)}>
        <div className={getStartedTriggerStyles.title}>Get Started</div>
        <div className={getStartedTriggerStyles.progress}>
          {remaining} remaining task{remaining > 1 ? 's' : ''}
        </div>
        <div>
          <div className={getStartedTriggerStyles.bar}>
            <div
              className={getStartedTriggerStyles.barFill}
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      </button>
      <GetStartedWizard isOpen={isOpen} onClose={toggle} tasks={tasks} docsUrl={getDocsUrl} />
    </>
  );
}
