import { createPreview, type NavPath } from 'react-foundry';
import { RetentionNoteView } from '@/components/organization/billing/retention-note';
import { BillingPlanType } from '@/gql/graphql';
import { retentionBoundary } from '@/lib/hooks/use-date-range-controller';
import { DateRangePicker, DateRangePickerPanel, presetLast7Days } from './date-range-picker';

export const nav: NavPath = 'Components/DateRangePicker';

const hobby = retentionBoundary(7);

/** The panel on a Hobby plan: presets past the week greyed out, the note under the custom range. */
export const HobbyWithUpgrade = createPreview(() => (
  <div className="bg-surface-overlay border-line inline-block rounded-lg border">
    <DateRangePickerPanel
      selectedRange={presetLast7Days.range}
      startDate={hobby}
      footer={
        <RetentionNoteView
          plan={BillingPlanType.Hobby}
          retentionInDays={7}
          subject="usage data"
          upgrade={{ organizationSlug: 'the-guild' }}
        />
      }
    />
  </div>
));

/** A member who may not see billing gets the sentence without the link. */
export const HobbyWithoutBillingAccess = createPreview(() => (
  <div className="bg-surface-overlay border-line inline-block rounded-lg border">
    <DateRangePickerPanel
      selectedRange={presetLast7Days.range}
      startDate={hobby}
      footer={
        <RetentionNoteView plan={BillingPlanType.Hobby} retentionInDays={7} subject="usage data" />
      }
    />
  </div>
));

/** Alert activity names its own retention, the log's, not the plan's usage retention. */
export const AlertActivity = createPreview(() => (
  <div className="bg-surface-overlay border-line inline-block rounded-lg border">
    <DateRangePickerPanel
      selectedRange={{ from: 'now-1h', to: 'now' }}
      startDate={hobby}
      footer={
        <RetentionNoteView
          plan={BillingPlanType.Pro}
          retentionInDays={7}
          subject="alert activity"
          upgrade={{ organizationSlug: 'the-guild' }}
        />
      }
    />
  </div>
));

/** The whole picker, as a page mounts it: open the trigger to see the note in place. */
export const InPlace = createPreview(() => (
  <DateRangePicker
    size="compact"
    selectedRange={presetLast7Days.range}
    startDate={hobby}
    footer={
      <RetentionNoteView
        plan={BillingPlanType.Hobby}
        retentionInDays={7}
        subject="usage data"
        upgrade={{ organizationSlug: 'the-guild' }}
      />
    }
  />
));
