import { type ReactNode, useState } from 'react';
import { Check } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { RadioGroup } from './radio-group';

export const nav: NavPath = 'Base/FormControls/RadioGroup';

export const Default = createPreview(() => {
  const [value, setValue] = useState('7d');

  return (
    <RadioGroup
      variant="as-button"
      value={value}
      onValueChange={setValue}
      items={[
        { value: '1h', label: 'Last hour' },
        { value: '1d', label: 'Last day' },
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
      ]}
    />
  );
});

/** A status dot before the label is just `content`: the item cva already lays it out as a row. */
export const WithIndicators = createPreview(() => {
  const [value, setValue] = useState('all');

  return (
    <RadioGroup
      variant="as-button"
      value={value}
      onValueChange={setValue}
      items={[
        { value: 'all', label: 'All' },
        {
          value: 'breaking',
          content: (
            <>
              <span className="bg-critical size-2 rounded-full" />
              Breaking
            </>
          ),
        },
        {
          value: 'dangerous',
          content: (
            <>
              <span className="bg-warning size-2 rounded-full" />
              Dangerous
            </>
          ),
        },
        {
          value: 'safe',
          content: (
            <>
              <span className="bg-success size-2 rounded-full" />
              Safe
            </>
          ),
        },
      ]}
    />
  );
});

export const TwoOptions = createPreview(() => {
  const [value, setValue] = useState('federation');

  return (
    <RadioGroup
      variant="as-button"
      value={value}
      onValueChange={setValue}
      items={[
        { value: 'federation', label: 'Federation' },
        { value: 'single', label: 'Single schema' },
      ]}
    />
  );
});

const SEVERITY_ITEMS = [
  {
    value: 'normal',
    label: 'Normal',
    description:
      'Minor problems or general questions with little to no impact on functionality, often involving small nuisances or easily bypassed errors.',
  },
  {
    value: 'high',
    label: 'High',
    description:
      'Significant problems affecting a subset of users or workflows, with a workaround available.',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    description: 'Critical failures blocking production traffic with no available workaround.',
  },
];

/** `as-card` stacks full-width options with a real radio dot and supporting copy. */
export const AsCard = createPreview(() => {
  const [value, setValue] = useState('normal');

  return (
    <div className="w-[493px]">
      <RadioGroup
        variant="as-card"
        onSurface="base"
        value={value}
        onValueChange={setValue}
        items={SEVERITY_ITEMS}
      />
    </div>
  );
});

/** `orientation` is independent of `variant`: cards side by side, buttons stacked. */
export const Orientations = createPreview(() => {
  const [cards, setCards] = useState('normal');
  const [buttons, setButtons] = useState('7d');

  return (
    <div className="flex flex-col gap-8">
      <div className="w-[760px]">
        <RadioGroup
          variant="as-card"
          orientation="vertical"
          value={cards}
          onValueChange={setCards}
          items={SEVERITY_ITEMS}
        />
      </div>
      <RadioGroup
        variant="as-button"
        orientation="horizontal"
        value={buttons}
        onValueChange={setButtons}
        items={[
          { value: '1h', label: 'Last hour' },
          { value: '1d', label: 'Last day' },
          { value: '7d', label: 'Last 7 days' },
        ]}
      />
    </div>
  );
});

/** The same cards on a floating surface (popover, dialog), which sits a step lighter. */
export const AsCardFloating = createPreview(() => {
  const [value, setValue] = useState('high');

  return (
    <div className="bg-neutral-3 w-[533px] rounded-md p-5">
      <RadioGroup
        variant="as-card"
        onSurface="floating"
        value={value}
        onValueChange={setValue}
        items={SEVERITY_ITEMS}
      />
    </div>
  );
});

function PlanBody(props: {
  name: string;
  price: string;
  description: string;
  features: string[];
  isCurrent?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col justify-between gap-6 self-stretch">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-neutral-12 text-sm font-semibold">{props.name}</span>
          {props.isCurrent ? (
            <span className="bg-accent_10 text-accent rounded-xs px-2 py-1 text-[11px] font-medium tracking-wide">
              CURRENT PLAN
            </span>
          ) : null}
        </div>
        <div className="text-neutral-12 text-3xl font-bold">{props.price}</div>
        <div className="text-neutral-10 text-[13px]">{props.description}</div>
        <div className="mt-6 flex flex-col gap-2">
          {props.features.map(feature => (
            <div key={feature} className="text-neutral-11 flex items-start gap-2 text-[13px]">
              <Check className="text-neutral-10 mt-0.5 size-4 shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>
      {props.footer ? (
        <div>
          <div className="border-neutral-5 mx-auto mb-4 w-9/12 border-b" />
          <div className="text-neutral-11 text-xs">{props.footer}</div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * `content` carrying a whole card body, which is what the billing plan picker needs: no radio dot,
 * selection shown by the card border alone. Three cards in a row also exercise equal-height stretch.
 */
export const PlanCards = createPreview(() => {
  const [value, setValue] = useState('pro');

  return (
    <div className="w-[62rem]">
      <RadioGroup
        variant="as-card"
        orientation="horizontal"
        value={value}
        onValueChange={setValue}
        items={[
          {
            value: 'hobby',
            content: (
              <PlanBody
                isCurrent
                name="Hobby"
                price="Free"
                description="For personal or small projects"
                features={[
                  'Unlimited seats, projects and organizations',
                  'Unlimited schema pushes & checks',
                  'Full access to all features (including SSO)',
                  'Limit of 1M operations per month',
                  '7 days of usage data retention',
                ]}
              />
            ),
          },
          {
            value: 'pro',
            content: (
              <PlanBody
                name="Pro"
                price="$10"
                description="For scaling APIs and teams"
                features={[
                  '+ $10 per 1M operations',
                  'Change your plan at any time',
                  'Everything in Hobby plan, and:',
                  '90 days of usage data retention',
                ]}
                footer={<span className="font-bold">Free 30 days trial period</span>}
              />
            ),
          },
          {
            value: 'enterprise',
            content: (
              <PlanBody
                name="Enterprise"
                price="Contact Us"
                description="Custom plan for large companies"
                features={[
                  'Unlimited seats',
                  'Unlimited operations',
                  'Unlimited schema pushes',
                  'Change your plan at any time',
                  'Improved pricing as you scale',
                  '12 months of usage data retention',
                ]}
                footer="Shape a custom plan for your business"
              />
            ),
          },
        ]}
      />
    </div>
  );
});
