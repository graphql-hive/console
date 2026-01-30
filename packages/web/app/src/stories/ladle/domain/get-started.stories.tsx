import { useState } from 'react';
import { Circle, CircleCheck } from 'lucide-react';
import { GetStartedWizard } from '@/components/get-started/wizard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Get Started',
};

// Mock tasks object
const allTasksIncomplete = {
  creatingProject: false,
  publishingSchema: false,
  checkingSchema: false,
  invitingMembers: false,
  reportingOperations: false,
  enablingUsageBasedBreakingChanges: false,
};

const someTasksComplete = {
  creatingProject: true,
  publishingSchema: true,
  checkingSchema: false,
  invitingMembers: false,
  reportingOperations: false,
  enablingUsageBasedBreakingChanges: false,
};

const mostTasksComplete = {
  creatingProject: true,
  publishingSchema: true,
  checkingSchema: true,
  invitingMembers: true,
  reportingOperations: true,
  enablingUsageBasedBreakingChanges: false,
};

const allTasksComplete = {
  creatingProject: true,
  publishingSchema: true,
  checkingSchema: true,
  invitingMembers: true,
  reportingOperations: true,
  enablingUsageBasedBreakingChanges: true,
};

const mockDocsUrl = (path: string) => `https://the-guild.dev/graphql/hive/docs${path}`;

export const WizardEmpty: Story = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)}>Open Get Started Wizard</Button>
      <GetStartedWizard
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tasks={allTasksIncomplete}
        docsUrl={mockDocsUrl}
      />
    </div>
  );
};

WizardEmpty.meta = {
  description: 'Get started wizard with no tasks completed',
};

export const WizardPartialProgress: Story = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)}>Open Get Started Wizard</Button>
      <GetStartedWizard
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tasks={someTasksComplete}
        docsUrl={mockDocsUrl}
      />
    </div>
  );
};

WizardPartialProgress.meta = {
  description: 'Get started wizard with 2 of 6 tasks completed',
};

export const WizardAlmostComplete: Story = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)}>Open Get Started Wizard</Button>
      <GetStartedWizard
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tasks={mostTasksComplete}
        docsUrl={mockDocsUrl}
      />
    </div>
  );
};

WizardAlmostComplete.meta = {
  description: 'Get started wizard with 5 of 6 tasks completed',
};

export const WizardComplete: Story = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)}>Open Get Started Wizard</Button>
      <GetStartedWizard
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tasks={allTasksComplete}
        docsUrl={mockDocsUrl}
      />
    </div>
  );
};

WizardComplete.meta = {
  description: 'Get started wizard with all tasks completed',
};

// Simplified progress trigger component without GraphQL
function GetStartedProgressTrigger({
  tasks,
  className,
}: {
  tasks: {
    creatingProject: boolean;
    publishingSchema: boolean;
    checkingSchema: boolean;
    invitingMembers: boolean;
    reportingOperations: boolean;
    enablingUsageBasedBreakingChanges: boolean;
  };
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
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
        onClick={() => setIsOpen(true)}
        className={cn('cursor-pointer rounded-sm px-4 py-2 text-left hover:opacity-80', className)}
      >
        <div className="text-neutral-11 text-sm font-medium">Get Started</div>
        <div className="text-neutral-10 text-xs">
          {remaining} remaining task{remaining > 1 ? 's' : ''}
        </div>
        <div>
          <div className="bg-neutral-5 relative mt-1 h-[5px] w-full overflow-hidden rounded-sm">
            <div className="bg-accent h-full" style={{ width: `${(completed / total) * 100}%` }} />
          </div>
        </div>
      </button>
      <GetStartedWizard
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tasks={tasks}
        docsUrl={mockDocsUrl}
      />
    </>
  );
}

export const ProgressTriggerEmpty: Story = () => (
  <div className="bg-neutral-1 p-8">
    <div className="max-w-xs">
      <GetStartedProgressTrigger tasks={allTasksIncomplete} />
    </div>
  </div>
);

ProgressTriggerEmpty.meta = {
  description: 'Progress trigger with 0 of 6 tasks complete (6 remaining)',
};

export const ProgressTriggerPartial: Story = () => (
  <div className="bg-neutral-1 p-8">
    <div className="max-w-xs">
      <GetStartedProgressTrigger tasks={someTasksComplete} />
    </div>
  </div>
);

ProgressTriggerPartial.meta = {
  description: 'Progress trigger with 2 of 6 tasks complete (4 remaining)',
};

export const ProgressTriggerAlmostComplete: Story = () => (
  <div className="bg-neutral-1 p-8">
    <div className="max-w-xs">
      <GetStartedProgressTrigger tasks={mostTasksComplete} />
    </div>
  </div>
);

ProgressTriggerAlmostComplete.meta = {
  description: 'Progress trigger with 5 of 6 tasks complete (1 remaining)',
};

export const ProgressTriggerComplete: Story = () => (
  <div className="bg-neutral-1 p-8">
    <div className="max-w-xs">
      <p className="text-neutral-11 text-sm">
        When all tasks are complete, the progress trigger doesn't render (returns null).
      </p>
      <GetStartedProgressTrigger tasks={allTasksComplete} />
      <p className="text-neutral-10 mt-4 text-xs">Above: No trigger shown because remaining = 0</p>
    </div>
  </div>
);

ProgressTriggerComplete.meta = {
  description: 'Progress trigger hidden when all tasks complete',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-5xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Get Started Components</h2>
      <p className="text-neutral-11 mb-4">
        Onboarding wizard and progress tracker for new users. Shows 6 tasks to complete when setting
        up a new organization: create project, publish schema, check schema, invite members, report
        operations, enable usage-based breaking changes.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">GetStartedWizard (Sheet)</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <ul className="text-neutral-10 space-y-1 text-xs">
              <li>
                <strong className="text-neutral-12">Container:</strong> Sheet component with{' '}
                <code className="text-neutral-12">w-[500px] sm:max-w-none</code>
              </li>
              <li>
                <strong className="text-neutral-12">Title:</strong> "Get Started"
              </li>
              <li>
                <strong className="text-neutral-12">Description:</strong> Follow the steps intro
                text
              </li>
              <li>
                <strong className="text-neutral-12">Tasks:</strong> 6 task items with links to docs
              </li>
              <li>
                <strong className="text-neutral-12">Spacing:</strong>{' '}
                <code className="text-neutral-12">space-y-3 py-4</code> between tasks
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Task Item</p>
          <div className="bg-neutral-1 border-neutral-6 space-y-3 rounded-sm border p-4">
            <a className="border-neutral-5 hover:bg-neutral-5 bg-neutral-4 relative block rounded-lg border p-4">
              <div className="flex items-start space-x-3">
                <Circle className="text-neutral-2 size-5" />
                <div className="w-0 flex-1">
                  <p className="text-neutral-12 font-medium leading-5">Create a project</p>
                  <p className="text-neutral-10 mt-1 text-sm">A project represents a GraphQL API</p>
                </div>
              </div>
            </a>
            <p className="text-neutral-10 text-xs">
              Incomplete task: <code className="text-neutral-12">Circle</code> icon in accent color
              <br />
              Background: <code className="text-neutral-12">bg-neutral-4</code>
              <br />
              Border: <code className="text-neutral-12">border-neutral-5</code>
              <br />
              Hover: <code className="text-neutral-12">hover:bg-neutral-5</code>
            </p>
          </div>
          <div className="bg-neutral-1 border-neutral-6 space-y-3 rounded-sm border p-4">
            <a className="border-neutral-5 hover:bg-neutral-5 bg-neutral-4 relative block rounded-lg border p-4 opacity-70">
              <div className="flex items-start space-x-3">
                <CircleCheck className="text-neutral-2 size-5" />
                <div className="w-0 flex-1">
                  <p className="text-neutral-12 font-medium leading-5">Create a project</p>
                  <p className="text-neutral-10 mt-1 text-sm">A project represents a GraphQL API</p>
                </div>
              </div>
            </a>
            <p className="text-neutral-10 text-xs">
              Completed task: <code className="text-neutral-12">CircleCheck</code> icon
              <br />
              Opacity: <code className="text-neutral-12">opacity-70</code> when completed
              <br />
              Icon: Lucide <code className="text-neutral-12">CircleCheck</code>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">GetStartedProgress Trigger</p>
          <div className="bg-neutral-1 border-neutral-6 space-y-3 rounded-sm border p-4">
            <button className="cursor-pointer rounded-sm px-4 py-2 text-left hover:opacity-80">
              <div className="text-neutral-11 text-sm font-medium">Get Started</div>
              <div className="text-neutral-10 text-xs">3 remaining tasks</div>
              <div>
                <div className="bg-neutral-5 relative mt-1 h-[5px] w-full overflow-hidden rounded-sm">
                  <div className="bg-neutral-2 h-full" style={{ width: '50%' }} />
                </div>
              </div>
            </button>
            <p className="text-neutral-10 text-xs">
              Button: <code className="text-neutral-12">cursor-pointer rounded-sm px-4 py-2</code>
              <br />
              Hover: <code className="text-neutral-12">hover:opacity-80</code>
              <br />
              Title: <code className="text-neutral-12">text-neutral-11 text-sm font-medium</code>
              <br />
              Subtitle: <code className="text-neutral-12">text-neutral-10 text-xs</code>
              <br />
              Progress bar background: <code className="text-neutral-12">bg-neutral-5 h-[5px]</code>
              <br />
              Progress fill: <code className="text-neutral-12">bg-neutral-2</code> (width
              percentage-based)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Progress Bar States</p>
          <div className="bg-neutral-1 border-neutral-6 space-y-4 rounded-sm border p-4">
            <div className="space-y-2">
              <p className="text-neutral-11 text-xs">0% Complete (0 of 6 tasks)</p>
              <div className="bg-neutral-5 relative h-[5px] w-full overflow-hidden rounded-sm">
                <div className="bg-neutral-2 h-full" style={{ width: '0%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-neutral-11 text-xs">33% Complete (2 of 6 tasks)</p>
              <div className="bg-neutral-5 relative h-[5px] w-full overflow-hidden rounded-sm">
                <div className="bg-neutral-2 h-full" style={{ width: '33%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-neutral-11 text-xs">67% Complete (4 of 6 tasks)</p>
              <div className="bg-neutral-5 relative h-[5px] w-full overflow-hidden rounded-sm">
                <div className="bg-neutral-2 h-full" style={{ width: '67%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-neutral-11 text-xs">100% Complete (6 of 6 tasks)</p>
              <div className="bg-neutral-5 relative h-[5px] w-full overflow-hidden rounded-sm">
                <div className="bg-neutral-2 h-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Task List</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <ol className="text-neutral-10 list-inside list-decimal space-y-1 text-xs">
              <li>Create a project - A project represents a GraphQL API</li>
              <li>Publish a schema - Publish your first schema to the registry</li>
              <li>Check a schema - Run a schema check to validate your changes</li>
              <li>Invite members - Invite your team members to collaborate</li>
              <li>Report operations - Collect and analyze your GraphQL API usage</li>
              <li>
                Enable usage-based schema checking - Detect breaking changes based on real usage
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">GetStartedWizard</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">isOpen</code>: boolean - Sheet open state
            </li>
            <li>
              <code className="text-neutral-12">onClose</code>: () =&gt; void - Close handler
            </li>
            <li>
              <code className="text-neutral-12">tasks</code>: Object with 6 boolean fields
            </li>
            <li>
              <code className="text-neutral-12">docsUrl</code>: (path: string) =&gt; string - Docs
              URL generator
            </li>
          </ul>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">GetStartedProgress</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">tasks</code>: FragmentType (GraphQL fragment)
            </li>
            <li>
              <code className="text-neutral-12">className?</code>: string - Optional CSS classes
            </li>
            <li>Automatically calculates progress and hides when all tasks complete</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Patterns</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">User Onboarding</p>
          <p className="text-neutral-10 text-xs">
            Displayed in organization layout headers beside user menu. Shows progress toward
            completing initial setup tasks. Clicking opens wizard sheet with detailed task list and
            documentation links.
          </p>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Task Completion Tracking</p>
          <p className="text-neutral-10 text-xs">
            Tasks are tracked in OrganizationGetStarted GraphQL type. Each boolean field represents
            one task. Progress trigger hides automatically when all tasks are complete (remaining =
            0).
          </p>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Documentation Links</p>
          <p className="text-neutral-10 text-xs">
            Each task links to relevant documentation page. Links open in new tab with noreferrer.
            Tasks can be completed by following the documentation and performing actions in the app.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Implementation Notes</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-2 text-xs">
          <li>
            <strong className="text-neutral-12">Sheet side panel:</strong> Uses Sheet component with
            500px width on desktop
          </li>
          <li>
            <strong className="text-neutral-12">Icons:</strong> Lucide Circle and CircleCheck for
            incomplete/complete states
          </li>
          <li>
            <strong className="text-neutral-12">Progress calculation:</strong> Filters boolean
            values, counts completed vs total
          </li>
          <li>
            <strong className="text-neutral-12">Auto-hide:</strong> Progress trigger returns null
            when remaining = 0
          </li>
          <li>
            <strong className="text-neutral-12">Conditional task:</strong> "Invite members" task may
            not always be present
          </li>
          <li>
            <strong className="text-neutral-12">Completed task styling:</strong> opacity-70 applied
            to completed tasks
          </li>
        </ul>
      </div>
    </div>
  </div>
);

ColorPaletteShowcase.meta = {
  description: 'Complete documentation of get-started component colors and structure',
};
