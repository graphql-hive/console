import { useState } from 'react';
import { BlocksIcon, BoxIcon, FoldVerticalIcon } from 'lucide-react';
import { createPreview, defineControls, type NavPath } from 'react-foundry';
import { RadioGroup } from '@/components/base/radio-group/radio-group';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const nav: NavPath = 'Components/RadioGroup';

/**
 * Every RadioGroup call site in the app, transcribed with its real copy so a change to the
 * component can be judged against what actually ships.
 *
 * The pages themselves cannot be imported: they mount react-hook-form or Formik, run GraphQL
 * queries, and several sit behind permission flags. Each preview reproduces the call site's
 * `items` and variant props and holds the selection in local state.
 *
 * `alert-form.tsx` is deliberately absent. It still uses an older shape, passing `<RadioItem>`
 * children with an `indicator` prop rather than an `items` array, and `RadioItem` is not
 * exported, so that file does not currently compile. It joins this list once Card is reconciled.
 */

// ---------------------------------------------------------------------------
// components/layouts/organization.tsx:388 - create-project dialog
// The only `onSurface="floating"` in the app, because it sits inside a Dialog.
// ---------------------------------------------------------------------------

const PROJECT_TYPES = [
  {
    type: 'SINGLE',
    title: 'Monolith',
    description: 'Single GraphQL schema developed as a monolith',
    Icon: BoxIcon,
  },
  {
    type: 'FEDERATION',
    title: 'Federation',
    description: 'Project developed according to Apollo Federation specification',
    Icon: BlocksIcon,
  },
  {
    type: 'STITCHING',
    title: 'Stitching',
    description: 'Project that stitches together multiple GraphQL APIs',
    Icon: FoldVerticalIcon,
  },
];

function ProjectTypePicker() {
  const [value, setValue] = useState('SINGLE');

  return (
    <div className="w-[28rem]">
      <RadioGroup
        variant="as-card"
        onSurface="floating"
        orientation="vertical"
        value={value}
        onValueChange={setValue}
        items={PROJECT_TYPES.map(({ type, title, description, Icon }) => ({
          value: type,
          ariaLabel: title,
          content: (
            <>
              <Icon
                className={cn(
                  'size-8 shrink-0',
                  value === type ? 'text-neutral-12' : 'text-neutral-9',
                )}
              />
              <div>
                <span className="text-neutral-12 text-sm font-medium">{title}</span>
                <p className="text-neutral-11 text-sm">{description}</p>
              </div>
            </>
          ),
        }))}
      />
    </div>
  );
}

export const ProjectType = createPreview({
  label: 'Project type (create-project dialog)',
  render: () => <ProjectTypePicker />,
});

// ---------------------------------------------------------------------------
// components/organization/settings/single-sign-on/oidc-integration-configuration.tsx:735
// Copy and option count both depend on `viewerCanManageSCIM`, so both are here.
// ---------------------------------------------------------------------------

function ProvisioningModes(props: { canManageSCIM: boolean }) {
  const [value, setValue] = useState('oidc');

  return (
    <div className="w-[52rem]">
      <RadioGroup
        variant="as-card"
        orientation="horizontal"
        value={value}
        onValueChange={setValue}
        items={[
          {
            value: 'oidc',
            label: props.canManageSCIM ? 'Mixed OIDC and SCIM' : 'Managed via OIDC',
            ariaLabel: props.canManageSCIM ? 'Mixed OIDC and SCIM' : 'Managed via OIDC',
            description: props.canManageSCIM
              ? 'Users are provisioned when signing in via OIDC. Optionally, users and groups can be provisioned via SCIM.'
              : 'Users are provisioned when signing in via OIDC.',
          },
          ...(props.canManageSCIM
            ? [
                {
                  value: 'scim',
                  label: 'Managed via SCIM',
                  ariaLabel: 'Managed via SCIM',
                  description:
                    'Users and groups are exclusively managed by your identity provider via SCIM. Roles and permissions are assigned to groups via role mappings.',
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}

export const ProvisioningWithSCIM = createPreview({
  label: 'OIDC provisioning (can manage SCIM)',
  render: () => <ProvisioningModes canManageSCIM />,
});

/** Without the permission there is a single option, so the group renders one card and no choice. */
export const ProvisioningWithoutSCIM = createPreview({
  label: 'OIDC provisioning (no SCIM permission)',
  render: () => <ProvisioningModes canManageSCIM={false} />,
});

// ---------------------------------------------------------------------------
// pages/organization-support.tsx:176 - new support ticket
// The plainest call site: label + description, no custom content.
// ---------------------------------------------------------------------------

const PRIORITY_ITEMS = [
  {
    value: 'NORMAL',
    label: 'Normal',
    description:
      'Minor problems or general questions with little to no impact on functionality, often involving small nuisances or easily bypassed errors.',
  },
  {
    value: 'HIGH',
    label: 'High',
    description:
      'Problems that significantly hinder functionality, resulting in severe performance degradation while the platform remains operational.',
  },
  {
    value: 'URGENT',
    label: 'Urgent',
    description:
      'Problems that halt essential functionality, preventing critical business operations with no workarounds available.',
  },
];

function PriorityPicker() {
  const [value, setValue] = useState('NORMAL');

  return (
    <div className="w-[36rem]">
      <RadioGroup
        variant="as-card"
        orientation="vertical"
        value={value}
        onValueChange={setValue}
        items={PRIORITY_ITEMS}
      />
    </div>
  );
}

export const SupportTicketPriority = createPreview({
  label: 'Support ticket priority',
  render: () => <PriorityPicker />,
});

// ---------------------------------------------------------------------------
// pages/target-settings.tsx:826 - conditional breaking changes
// The only site combining `withIndicator` with custom `content`, and the only one
// with an interactive control inside an option.
// ---------------------------------------------------------------------------

function BreakingChangeFormula(props: { disabled?: boolean }) {
  const [value, setValue] = useState('PERCENTAGE');

  return (
    <div className="w-[36rem]">
      <RadioGroup
        variant="as-card"
        orientation="vertical"
        disabled={props.disabled}
        value={value}
        onValueChange={setValue}
        items={[
          {
            value: 'PERCENTAGE',
            ariaLabel: 'Percent of Traffic',
            withIndicator: true,
            content: (
              <span>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={5}
                  disabled={props.disabled}
                  className="inline-flex! mr-2 w-16 text-center"
                />
                Percent of Traffic
              </span>
            ),
          },
          {
            value: 'REQUEST_COUNT',
            ariaLabel: 'Total Operations',
            withIndicator: true,
            content: (
              <span>
                <Input
                  type="number"
                  defaultValue={100}
                  disabled={props.disabled}
                  className="inline-flex! mr-2 w-16 text-center"
                />
                Total Operations
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

export const BreakingChanges = createPreview({
  label: 'Breaking change formula',
  render: () => <BreakingChangeFormula />,
});

/** `disabled={isSubmitting}` disables the group and the inputs inside each option. */
export const BreakingChangesSubmitting = createPreview({
  label: 'Breaking change formula (submitting)',
  render: () => <BreakingChangeFormula disabled />,
});

// ---------------------------------------------------------------------------
// components/organization/billing/BillingPlanPicker.tsx:143 lives at
// Migration > Live > BillingPlanPicker, which renders the real component.
// ---------------------------------------------------------------------------

/**
 * Controls map to the props `RadioGroup` actually takes. Item shape is a control too, because
 * `label`/`description` and `content` are mutually exclusive in `RadioItemProps` and they lay
 * out differently.
 */
export const Playground = createPreview({
  controls: defineControls({
    variant: { type: 'radio', options: ['as-card', 'as-button'], default: 'as-card' },
    orientation: { type: 'radio', options: ['vertical', 'horizontal'], default: 'vertical' },
    onSurface: { type: 'radio', options: ['base', 'floating'], default: 'base' },
    disabled: { type: 'boolean', default: false },
    itemShape: { type: 'radio', options: ['label', 'content'], default: 'label' },
    withIndicator: { type: 'boolean', default: false },
    withDescription: { type: 'boolean', default: true },
    optionCount: { type: 'range', min: 1, max: 4, step: 1, default: 3 },
  }),
  render: v => <PlaygroundGroup {...v} />,
});

function PlaygroundGroup(props: {
  variant: 'as-card' | 'as-button';
  orientation: 'vertical' | 'horizontal';
  onSurface: 'base' | 'floating';
  disabled: boolean;
  itemShape: 'label' | 'content';
  withIndicator: boolean;
  withDescription: boolean;
  optionCount: number;
}) {
  const [value, setValue] = useState('option-1');
  const labels = ['Monolith', 'Federation', 'Stitching', 'Proxy'];

  const items = Array.from({ length: props.optionCount }, (_, i) =>
    props.itemShape === 'content'
      ? {
          value: `option-${i + 1}`,
          ariaLabel: labels[i],
          withIndicator: props.withIndicator,
          content: (
            <>
              <BoxIcon className="text-neutral-9 size-8 shrink-0" />
              <div>
                <span className="text-neutral-12 text-sm font-medium">{labels[i]}</span>
                {props.withDescription ? (
                  <p className="text-neutral-11 text-sm">Custom content replaces the label.</p>
                ) : null}
              </div>
            </>
          ),
        }
      : {
          value: `option-${i + 1}`,
          label: labels[i],
          description: props.withDescription
            ? 'Supporting copy, rendered by as-card only.'
            : undefined,
        },
  );

  return (
    <div className={props.orientation === 'horizontal' ? 'w-[52rem]' : 'w-[36rem]'}>
      <RadioGroup
        variant={props.variant}
        orientation={props.orientation}
        onSurface={props.onSurface}
        disabled={props.disabled}
        value={value}
        onValueChange={setValue}
        items={items}
      />
    </div>
  );
}
