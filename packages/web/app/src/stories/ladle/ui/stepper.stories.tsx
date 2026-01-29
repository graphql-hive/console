import React from 'react';
import { CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { defineStepper } from '@/components/ui/stepper';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Stepper',
};

// Define a simple stepper for examples
const SimpleStepper = defineStepper(
  { id: 'step-1', title: 'Account' },
  { id: 'step-2', title: 'Profile' },
  { id: 'step-3', title: 'Preferences' },
);

const AccessTokenStepper = defineStepper(
  { id: 'step-1-general', title: 'General' },
  { id: 'step-2-permissions', title: 'Permissions' },
  { id: 'step-3-resources', title: 'Resources' },
  { id: 'step-4-confirmation', title: 'Confirm' },
);

export const HorizontalStepper: Story = () => {
  return (
    <div className="max-w-3xl p-8">
      <SimpleStepper.StepperProvider variant="horizontal">
        {({ stepper }) => (
          <div className="space-y-6">
            <SimpleStepper.StepperNavigation>
              {stepper.all.map(step => (
                <SimpleStepper.StepperStep key={step.id} of={step.id}>
                  <SimpleStepper.StepperTitle>{step.title}</SimpleStepper.StepperTitle>
                </SimpleStepper.StepperStep>
              ))}
            </SimpleStepper.StepperNavigation>

            <div className="border-neutral-6 rounded-lg border p-6">
              {stepper.switch({
                'step-1': () => <div className="text-neutral-12">Step 1: Account setup</div>,
                'step-2': () => <div className="text-neutral-12">Step 2: Profile information</div>,
                'step-3': () => <div className="text-neutral-12">Step 3: Set preferences</div>,
              })}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => stepper.prev()} disabled={stepper.isFirst}>
                Previous
              </Button>
              <Button onClick={() => stepper.next()} disabled={stepper.isLast}>
                Next
              </Button>
            </div>
          </div>
        )}
      </SimpleStepper.StepperProvider>
    </div>
  );
};

HorizontalStepper.meta = {
  description: 'Horizontal stepper with navigation buttons',
};

export const VerticalStepper: Story = () => {
  return (
    <div className="max-w-3xl p-8">
      <SimpleStepper.StepperProvider variant="vertical">
        {({ stepper }) => (
          <div className="flex gap-6">
            <SimpleStepper.StepperNavigation className="w-48">
              {stepper.all.map(step => (
                <SimpleStepper.StepperStep key={step.id} of={step.id}>
                  <SimpleStepper.StepperTitle>{step.title}</SimpleStepper.StepperTitle>
                </SimpleStepper.StepperStep>
              ))}
            </SimpleStepper.StepperNavigation>

            <div className="border-neutral-6 flex-1 rounded-lg border p-6">
              {stepper.switch({
                'step-1': () => <div className="text-neutral-12">Step 1 content</div>,
                'step-2': () => <div className="text-neutral-12">Step 2 content</div>,
                'step-3': () => <div className="text-neutral-12">Step 3 content</div>,
              })}

              <div className="mt-6 flex gap-2">
                <Button onClick={() => stepper.prev()} disabled={stepper.isFirst}>
                  Previous
                </Button>
                <Button onClick={() => stepper.next()} disabled={stepper.isLast}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </SimpleStepper.StepperProvider>
    </div>
  );
};

VerticalStepper.meta = {
  description: 'Vertical stepper layout',
};

export const CircleStepper: Story = () => {
  return (
    <div className="max-w-3xl p-8">
      <SimpleStepper.StepperProvider variant="circle">
        {({ stepper }) => (
          <div className="space-y-6">
            <SimpleStepper.StepperNavigation>
              {stepper.all.map(step => (
                <SimpleStepper.StepperStep key={step.id} of={step.id}>
                  <SimpleStepper.StepperTitle className="text-neutral-12 font-semibold">
                    {step.title}
                  </SimpleStepper.StepperTitle>
                  <SimpleStepper.StepperDescription className="text-neutral-11 text-sm">
                    Complete this step
                  </SimpleStepper.StepperDescription>
                </SimpleStepper.StepperStep>
              ))}
            </SimpleStepper.StepperNavigation>

            <div className="border-neutral-6 rounded-lg border p-6">
              {stepper.switch({
                'step-1': () => <div className="text-neutral-12">Step 1 content</div>,
                'step-2': () => <div className="text-neutral-12">Step 2 content</div>,
                'step-3': () => <div className="text-neutral-12">Step 3 content</div>,
              })}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => stepper.prev()} disabled={stepper.isFirst}>
                Previous
              </Button>
              <Button onClick={() => stepper.next()} disabled={stepper.isLast}>
                Next
              </Button>
            </div>
          </div>
        )}
      </SimpleStepper.StepperProvider>
    </div>
  );
};

CircleStepper.meta = {
  description: 'Circle variant with progress indicator',
};

export const AccessTokenWizard: Story = () => {
  return (
    <div className="max-w-4xl p-8">
      <div className="mb-6 space-y-4">
        <h2 className="text-neutral-12 text-2xl font-bold">Create Access Token</h2>
        <p className="text-neutral-11 text-sm">
          Create a new access token with specified permissions and optionally assigned resources.
        </p>
      </div>

      <AccessTokenStepper.StepperProvider variant="horizontal">
        {({ stepper }) => (
          <div className="space-y-6">
            <AccessTokenStepper.StepperNavigation className="pb-4">
              {stepper.all.map(step => (
                <AccessTokenStepper.StepperStep key={step.id} of={step.id} clickable={false}>
                  <AccessTokenStepper.StepperTitle>{step.title}</AccessTokenStepper.StepperTitle>
                </AccessTokenStepper.StepperStep>
              ))}
            </AccessTokenStepper.StepperNavigation>

            <div className="border-neutral-6 min-h-[300px] rounded-lg border p-6">
              {stepper.switch({
                'step-1-general': () => (
                  <div className="space-y-4">
                    <h3 className="text-neutral-12 font-semibold">General Information</h3>
                    <div className="space-y-2">
                      <label className="text-neutral-12 text-sm">Token Name</label>
                      <Input placeholder="My Access Token" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-neutral-12 text-sm">Description</label>
                      <Input placeholder="Used for CI/CD pipeline" />
                    </div>
                  </div>
                ),
                'step-2-permissions': () => (
                  <div className="space-y-4">
                    <h3 className="text-neutral-12 font-semibold">Select Permissions</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" />
                        <span className="text-neutral-12 text-sm">Read schema</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" />
                        <span className="text-neutral-12 text-sm">Publish schema</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" />
                        <span className="text-neutral-12 text-sm">Delete schema</span>
                      </label>
                    </div>
                  </div>
                ),
                'step-3-resources': () => (
                  <div className="space-y-4">
                    <h3 className="text-neutral-12 font-semibold">Assign Resources</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="radio" name="resources" defaultChecked />
                        <span className="text-neutral-12 text-sm">All projects</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" name="resources" />
                        <span className="text-neutral-12 text-sm">Specific projects</span>
                      </label>
                    </div>
                  </div>
                ),
                'step-4-confirmation': () => (
                  <div className="space-y-4">
                    <h3 className="text-neutral-12 font-semibold">Review and Confirm</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-neutral-11">Token Name</div>
                        <div className="text-neutral-12 font-medium">My Access Token</div>
                      </div>
                      <div>
                        <div className="text-neutral-11">Permissions</div>
                        <div className="text-neutral-12 font-medium">
                          Read schema, Publish schema
                        </div>
                      </div>
                      <div>
                        <div className="text-neutral-11">Resources</div>
                        <div className="text-neutral-12 font-medium">All projects</div>
                      </div>
                    </div>
                  </div>
                ),
              })}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => stepper.prev()} disabled={stepper.isFirst}>
                Previous
              </Button>
              {stepper.isLast ? (
                <Button>Create Token</Button>
              ) : (
                <Button onClick={() => stepper.next()}>Next</Button>
              )}
            </div>
          </div>
        )}
      </AccessTokenStepper.StepperProvider>
    </div>
  );
};

AccessTokenWizard.meta = {
  description:
    'Multi-step wizard for creating access tokens, based on create-access-token-sheet-content.tsx',
};

export const WithCustomIcons: Story = () => {
  return (
    <div className="max-w-3xl p-8">
      <SimpleStepper.StepperProvider variant="horizontal">
        {({ stepper }) => (
          <div className="space-y-6">
            <SimpleStepper.StepperNavigation>
              {stepper.all.map((step, index) => (
                <SimpleStepper.StepperStep
                  key={step.id}
                  of={step.id}
                  icon={
                    stepper.current.id === step.id ? (
                      index + 1
                    ) : stepper.when(step.id, 'complete') ? (
                      <CheckIcon className="size-4" />
                    ) : (
                      index + 1
                    )
                  }
                >
                  <SimpleStepper.StepperTitle>{step.title}</SimpleStepper.StepperTitle>
                </SimpleStepper.StepperStep>
              ))}
            </SimpleStepper.StepperNavigation>

            <div className="border-neutral-6 rounded-lg border p-6">
              {stepper.switch({
                'step-1': () => <div className="text-neutral-12">Step 1 content</div>,
                'step-2': () => <div className="text-neutral-12">Step 2 content</div>,
                'step-3': () => <div className="text-neutral-12">Step 3 content</div>,
              })}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => stepper.prev()} disabled={stepper.isFirst}>
                Previous
              </Button>
              <Button onClick={() => stepper.next()} disabled={stepper.isLast}>
                Next
              </Button>
            </div>
          </div>
        )}
      </SimpleStepper.StepperProvider>
    </div>
  );
};

WithCustomIcons.meta = {
  description: 'Stepper with custom icons showing check marks for completed steps',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Stepper Component</h2>
      <p className="text-neutral-11 mb-4">
        Multi-step wizard component built on @stepperize/react. Supports horizontal, vertical, and
        circle variants. Used for complex forms and workflows like access token creation.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Horizontal Variant</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <SimpleStepper.StepperProvider variant="horizontal">
              {({ stepper }) => (
                <SimpleStepper.StepperNavigation>
                  {stepper.all.map(step => (
                    <SimpleStepper.StepperStep key={step.id} of={step.id}>
                      <SimpleStepper.StepperTitle>{step.title}</SimpleStepper.StepperTitle>
                    </SimpleStepper.StepperStep>
                  ))}
                </SimpleStepper.StepperNavigation>
              )}
            </SimpleStepper.StepperProvider>
          </div>
          <p className="text-neutral-10 text-xs">
            Active step button: <code className="text-neutral-12">variant="default"</code>
            <br />
            Inactive step button: <code className="text-neutral-12">variant="secondary"</code>
            <br />
            Completed steps shown with line connector
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Vertical Variant</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <SimpleStepper.StepperProvider variant="vertical">
              {({ stepper }) => (
                <SimpleStepper.StepperNavigation className="w-48">
                  {stepper.all.map(step => (
                    <SimpleStepper.StepperStep key={step.id} of={step.id}>
                      <SimpleStepper.StepperTitle>{step.title}</SimpleStepper.StepperTitle>
                    </SimpleStepper.StepperStep>
                  ))}
                </SimpleStepper.StepperNavigation>
              )}
            </SimpleStepper.StepperProvider>
          </div>
          <p className="text-neutral-10 text-xs">
            Vertical layout with steps stacked, good for sidebar navigation
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Circle Variant</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <SimpleStepper.StepperProvider variant="circle">
              {({ stepper }) => (
                <SimpleStepper.StepperNavigation>
                  {stepper.all.map(step => (
                    <SimpleStepper.StepperStep key={step.id} of={step.id}>
                      <SimpleStepper.StepperTitle className="text-neutral-12 font-semibold">
                        {step.title}
                      </SimpleStepper.StepperTitle>
                      <SimpleStepper.StepperDescription className="text-neutral-11 text-sm">
                        Step description
                      </SimpleStepper.StepperDescription>
                    </SimpleStepper.StepperStep>
                  ))}
                </SimpleStepper.StepperNavigation>
              )}
            </SimpleStepper.StepperProvider>
          </div>
          <p className="text-neutral-10 text-xs">
            Circular progress indicator showing current step out of total
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Pattern</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <pre className="text-neutral-10 overflow-x-auto whitespace-pre-wrap text-xs">
          {`// 1. Define stepper with steps
const Stepper = defineStepper(
  { id: 'step-1', title: 'General' },
  { id: 'step-2', title: 'Permissions' },
  { id: 'step-3', title: 'Confirm' }
);

// 2. Wrap in StepperProvider
<Stepper.StepperProvider variant="horizontal">
  {({ stepper }) => (
    <>
      {/* 3. Render navigation */}
      <Stepper.StepperNavigation>
        {stepper.all.map(step => (
          <Stepper.StepperStep key={step.id} of={step.id}>
            <Stepper.StepperTitle>{step.title}</Stepper.StepperTitle>
          </Stepper.StepperStep>
        ))}
      </Stepper.StepperNavigation>

      {/* 4. Switch between step content */}
      {stepper.switch({
        'step-1': () => <Step1Content />,
        'step-2': () => <Step2Content />,
        'step-3': () => <Step3Content />,
      })}

      {/* 5. Navigation controls */}
      <Button onClick={() => stepper.prev()}>Previous</Button>
      <Button onClick={() => stepper.next()}>Next</Button>
    </>
  )}
</Stepper.StepperProvider>`}
        </pre>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">API Reference</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">defineStepper(...steps)</p>
          <p className="text-neutral-10 text-xs">
            Creates a stepper instance with provided steps. Returns StepperProvider,
            StepperNavigation, StepperStep, and other components.
          </p>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">StepperProvider Props</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">variant</code>: "horizontal" | "vertical" | "circle"
            </li>
            <li>
              <code className="text-neutral-12">labelOrientation</code>: "horizontal" | "vertical"
            </li>
            <li>
              <code className="text-neutral-12">tracking</code>: boolean (optional)
            </li>
            <li>
              <code className="text-neutral-12">initialStep</code>: string (optional)
            </li>
            <li>
              <code className="text-neutral-12">children</code>: ReactNode | function
            </li>
          </ul>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Stepper Instance Methods</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">stepper.next()</code> - Go to next step
            </li>
            <li>
              <code className="text-neutral-12">stepper.prev()</code> - Go to previous step
            </li>
            <li>
              <code className="text-neutral-12">stepper.goTo(id)</code> - Jump to specific step
            </li>
            <li>
              <code className="text-neutral-12">stepper.isFirst</code> - Boolean for first step
            </li>
            <li>
              <code className="text-neutral-12">stepper.isLast</code> - Boolean for last step
            </li>
            <li>
              <code className="text-neutral-12">stepper.current</code> - Current step object
            </li>
            <li>
              <code className="text-neutral-12">stepper.all</code> - Array of all steps
            </li>
            <li>
              <code className="text-neutral-12">stepper.switch()</code> - Render step-specific
              content
            </li>
          </ul>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">StepperStep Props</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">of</code>: string (required) - Step ID
            </li>
            <li>
              <code className="text-neutral-12">icon</code>: ReactNode (optional) - Custom icon
            </li>
            <li>
              <code className="text-neutral-12">clickable</code>: boolean (optional) - Allow
              clicking to navigate
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Access Token Creation</p>
          <p className="text-neutral-10 text-xs">
            4-step wizard for creating access tokens with general info, permissions, resource
            selection, and confirmation (create-access-token-sheet-content.tsx).
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Multi-Step Forms</p>
          <p className="text-neutral-10 text-xs">
            Break complex forms into digestible steps with validation at each stage.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Onboarding Flows</p>
          <p className="text-neutral-10 text-xs">
            Guide users through setup processes with clear progress indicators.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Configuration Wizards</p>
          <p className="text-neutral-10 text-xs">
            Complex configuration workflows divided into logical steps.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Accessibility</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>Navigation has role="tablist"</li>
          <li>Step buttons have role="tab"</li>
          <li>Proper aria-controls, aria-current, aria-selected attributes</li>
          <li>Keyboard navigation supported (arrow keys)</li>
          <li>Inactive steps have tabIndex={-1}</li>
          <li>Active/complete states clearly indicated</li>
        </ul>
      </div>
    </div>
  </div>
);
