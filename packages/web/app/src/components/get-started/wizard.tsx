import { ReactElement, ReactNode } from 'react';
import clsx from 'clsx';
import { DocumentType, gql } from 'urql';
import { Drawer } from '@/components/v2';
import { OrganizationType } from '@/graphql';
import { getDocsUrl } from '@/lib/docs-url';
import { useToggle } from '@/lib/hooks';
import { CheckCircledIcon } from '@radix-ui/react-icons';

const GetStartedWizard_GetStartedProgress = gql(/* GraphQL */ `
  fragment GetStartedWizard_GetStartedProgress on OrganizationGetStarted {
    creatingProject
    publishingSchema
    checkingSchema
    invitingMembers
    reportingOperations
    enablingUsageBasedBreakingChanges
  }
`);

export function GetStartedProgress({
  tasks,
  organizationType,
}: {
  tasks: DocumentType<typeof GetStartedWizard_GetStartedProgress>;
  organizationType: OrganizationType;
}): ReactElement | null {
  const [isOpen, toggle] = useToggle();

  if (!tasks) {
    return null;
  }

  const processedTasks =
    organizationType === OrganizationType.Personal
      ? {
          ...tasks,
          invitingMembers: undefined,
        }
      : tasks;
  const values = Object.values(processedTasks).filter(v => typeof v === 'boolean');
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
        className="cursor-pointer rounded px-4 py-2 text-left hover:opacity-80"
      >
        <div className="text-sm font-medium">Get Started</div>
        <div className="text-xs text-gray-500">
          {remaining} remaining task{remaining > 1 ? 's' : ''}
        </div>
        <div>
          <div className="relative mt-1 w-full overflow-hidden rounded bg-gray-800 h-[5px]">
            <div
              className="h-full bg-orange-500"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      </button>
      <GetStartedWizard isOpen={isOpen} onClose={toggle} tasks={processedTasks} />
    </>
  );
}

function GetStartedWizard({
  isOpen,
  onClose,
  tasks,
}: {
  isOpen: boolean;
  onClose(): void;
  tasks:
    | DocumentType<typeof GetStartedWizard_GetStartedProgress>
    | Omit<DocumentType<typeof GetStartedWizard_GetStartedProgress>, 'invitingMembers'>;
}): ReactElement {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <Drawer.Title>Get Started</Drawer.Title>
      <p>Complete these steps to experience the full power of GraphQL Hive</p>
      <div className="mt-4 flex flex-col divide-y-2 divide-gray-900">
        <Task link={getDocsUrl('/get-started/projects')} completed={tasks.creatingProject}>
          Create a project
        </Task>
        <Task link={getDocsUrl('/features/publish-schema')} completed={tasks.publishingSchema}>
          Publish a schema
        </Task>
        <Task link={getDocsUrl('/features/checking-schema')} completed={tasks.checkingSchema}>
          Check a schema
        </Task>
        {'invitingMembers' in tasks && typeof tasks.invitingMembers === 'boolean' ? (
          <Task
            link={getDocsUrl('/get-started/organizations#members')}
            completed={tasks.invitingMembers}
          >
            Invite members
          </Task>
        ) : null}
        <Task link={getDocsUrl('/features/monitoring')} completed={tasks.reportingOperations}>
          Report operations
        </Task>
        <Task
          link={getDocsUrl('/features/checking-schema#with-usage-enabled')}
          completed={tasks.enablingUsageBasedBreakingChanges}
        >
          Enable usage-based breaking changes
        </Task>
      </div>
    </Drawer>
  );
}

function Task({
  completed,
  children,
  link,
}: {
  children: ReactNode;
  completed: boolean;
  link: string | null;
}): ReactElement {
  return (
    <a
      href={link ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-4 p-3"
    >
      <CheckCircledIcon
        className={clsx('h-5 w-auto', completed ? 'text-green-500' : 'text-gray-500')}
      />

      <span className={completed ? 'opacity-50 line-through' : 'hover:opacity-80'}>{children}</span>
    </a>
  );
}
