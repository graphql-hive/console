import { ReactElement } from 'react';
import { Circle, CircleCheck } from 'lucide-react';
import { Sheet } from '@/components/ui/primitives/overlays/sheet/sheet';
import { cn } from '@/lib/utils';

export function GetStartedWizard({
  isOpen,
  onClose,
  tasks,
  docsUrl,
}: {
  docsUrl: (path: string) => string;
  isOpen: boolean;
  onClose(): void;
  tasks: {
    creatingProject: boolean;
    publishingSchema: boolean;
    checkingSchema: boolean;
    invitingMembers: boolean;
    reportingOperations: boolean;
    enablingUsageBasedBreakingChanges: boolean;
  };
}): ReactElement {
  return (
    <Sheet
      open={isOpen}
      onOpenChange={onClose}
      title="Get Started"
      description="Follow the steps to set up your organization and experience the full power of GraphQL Hive"
    >
      <div className="space-y-3">
        <Task
          link={docsUrl('/schema-registry/management/projects#create-a-new-project')}
          completed={tasks.creatingProject}
          title="Create a project"
          description="A project represents a GraphQL API"
        />
        <Task
          link={docsUrl('/features/schema-registry#publish-a-schema')}
          completed={tasks.publishingSchema}
          title="Publish a schema"
          description="Publish your first schema to the registry"
        />
        <Task
          link={docsUrl('/features/schema-registry#check-a-schema')}
          completed={tasks.checkingSchema}
          title="Check a schema"
          description="Run a schema check to validate your changes"
        />
        {'invitingMembers' in tasks && typeof tasks.invitingMembers === 'boolean' ? (
          <Task
            link={docsUrl(
              '/schema-registry/management/members-roles-permissions#inviting-new-members',
            )}
            completed={tasks.invitingMembers}
            title="Invite members"
            description="Invite your team members to collaborate on your projects"
          />
        ) : null}

        <Task
          link={docsUrl('/features/usage-reporting')}
          completed={tasks.reportingOperations}
          title="Report operations"
          description="Collect and analyze your GraphQL API usage"
        />
        <Task
          link={docsUrl('/schema-registry/management/targets#conditional-breaking-changes')}
          completed={tasks.enablingUsageBasedBreakingChanges}
          title="Enable usage-based schema checking"
          description="Detect breaking changes based on real usage data"
        />
      </div>
    </Sheet>
  );
}

function Task({
  completed,
  link,
  title,
  description,
}: {
  completed: boolean;
  title: string;
  description: string;
  link: string | null;
}) {
  return (
    <a
      href={link ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'relative block rounded-lg border border-line bg-surface-hover p-4 hover:bg-surface-selected',
        completed ? 'opacity-70' : null,
      )}
    >
      <div className="flex items-start space-x-3">
        {completed ? (
          <CircleCheck className="size-5 text-accent" />
        ) : (
          <Circle className="size-5 text-accent" />
        )}
        <div className="w-0 flex-1">
          <p className="leading-5 font-medium text-fg">{title}</p>
          <p className="mt-1 text-sm text-fg-secondary">{description}</p>
        </div>
      </div>
    </a>
  );
}
