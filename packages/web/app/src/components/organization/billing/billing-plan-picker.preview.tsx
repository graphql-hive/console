import { createPreview, defineControls, type NavPath } from 'react-foundry';
import {
  BillingPlanPicker,
  BillingPlanPicker_PlanFragment,
} from '@/components/organization/billing/BillingPlanPicker';
import { makeFragmentData } from '@/gql';
import { BillingPlanType } from '@/gql/graphql';

export const nav: NavPath = 'Components/BillingPlanPicker';

/**
 * The real `BillingPlanPicker` from the Manage Subscription page, rendered without the app.
 */
const plan = (planType: BillingPlanType, name: string, basePrice: number | null) =>
  makeFragmentData(
    { __typename: 'BillingPlan' as const, id: planType, planType, name, basePrice },
    BillingPlanPicker_PlanFragment,
  );

/**
 * Shaped like the server's `billingPlans` resolver.
 */
const plans = [
  plan(BillingPlanType.Hobby, 'Hobby', 0),
  plan(BillingPlanType.Pro, 'Pro', 10),
  plan(BillingPlanType.Enterprise, 'Enterprise', null),
];

/** The common case: on Hobby, Hobby selected, so "CURRENT PLAN" sits on the selected card. */
export const Default = createPreview(() => (
  <div className="w-[64rem]">
    <BillingPlanPicker
      plans={plans}
      value={BillingPlanType.Hobby}
      activePlan={BillingPlanType.Hobby}
      onPlanChange={() => {}}
    />
  </div>
));

/**
 * Mid-upgrade: still on Hobby but previewing Pro. Selection border and the "CURRENT PLAN" label
 * land on different cards, which is the only state where the two readouts can be told apart.
 */
export const UpgradingFromHobby = createPreview(() => (
  <div className="w-[64rem]">
    <BillingPlanPicker
      plans={plans}
      value={BillingPlanType.Pro}
      activePlan={BillingPlanType.Hobby}
      onPlanChange={() => {}}
    />
  </div>
));

/** What a viewer without `billing:update` sees: no hover affordance, cards inert. */
export const Disabled = createPreview(() => (
  <div className="w-[64rem]">
    <BillingPlanPicker
      disabled
      plans={plans}
      value={BillingPlanType.Enterprise}
      activePlan={BillingPlanType.Enterprise}
      onPlanChange={() => {}}
    />
  </div>
));

export const Playground = createPreview({
  controls: defineControls({
    value: {
      type: 'radio',
      options: [BillingPlanType.Hobby, BillingPlanType.Pro, BillingPlanType.Enterprise],
      default: BillingPlanType.Hobby,
    },
    activePlan: {
      type: 'radio',
      options: [BillingPlanType.Hobby, BillingPlanType.Pro, BillingPlanType.Enterprise],
      default: BillingPlanType.Hobby,
    },
    proBasePrice: { type: 'number', default: 10 },
    disabled: { type: 'boolean', default: false },
  }),
  render: v => (
    <div className="w-[64rem]">
      <BillingPlanPicker
        disabled={v.disabled}
        plans={[
          plan(BillingPlanType.Hobby, 'Hobby', 0),
          plan(BillingPlanType.Pro, 'Pro', v.proBasePrice),
          plan(BillingPlanType.Enterprise, 'Enterprise', null),
        ]}
        value={v.value}
        activePlan={v.activePlan}
        onPlanChange={() => {}}
      />
    </div>
  ),
});
