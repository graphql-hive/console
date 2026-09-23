import { useState } from 'react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { FailureCard } from './failure-card';

export const nav: NavPath = 'Components/FailureCard';

/**
 * The failures a check or a version has, named above the content that scopes to one of them at a
 * time. The rows carry the CLI's wording for the reason and a count of what it found, so the card
 * reads like the top of the terminal report.
 */

const CHECK_FAILURES = [
  { key: 'mobile', label: 'mobile', reason: 'Composition failed.', detail: '2 errors' },
  {
    key: 'billing',
    label: 'billing',
    reason: 'Unapproved breaking changes!',
    detail: '1 breaking change',
  },
];

/** The schema check page: two of eleven contracts failed, for different reasons. */
export const Default = createPreview(() => {
  const [viewing, setViewing] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <FailureCard
        title="2 of 11 contracts failed"
        aside="9 passed"
        items={CHECK_FAILURES.map(item => ({ ...item, onView: () => setViewing(item.key) }))}
      />
      <p className="text-neutral-10 text-xs">
        {viewing ? `Scoped to ${viewing}` : 'Nothing picked yet'}
      </p>
    </div>
  );
});

/** The schema version page: contract versions are labelled name@id, and only composition can fail. */
export const Versions = createPreview(() => (
  <FailureCard
    title="1 of 11 contracts failed"
    aside="10 passed"
    items={[
      {
        key: 'billing',
        label: 'billing@9e0f1a2b',
        reason: 'Contract composition failed.',
        detail: '3 errors',
        onView: () => {},
      },
    ]}
  />
));

/** Many failures stack without the card growing wider; long names truncate with the full name on hover. */
export const Many = createPreview(() => (
  <FailureCard
    title="6 of 11 contracts failed"
    aside="5 passed"
    items={[
      'mobile',
      'billing',
      'partner-api-for-the-european-reseller-network',
      'checkout',
      'analytics',
      'legacy-web',
    ].map((name, index) => ({
      key: name,
      label: name,
      reason: index % 2 ? 'Unapproved breaking changes!' : 'Composition failed.',
      detail: index % 2 ? `${index} breaking changes` : `${index + 1} errors`,
      onView: () => {},
    }))}
  />
));

/** Without `onView` the rows have no button: a summary that does not scope anything. */
export const WithoutView = createPreview(() => (
  <FailureCard title="2 of 11 contracts failed" items={CHECK_FAILURES} />
));

export const Playground = createPreview({
  controls: controlsFor(FailureCard, {
    title: { type: 'text', default: '2 of 11 contracts failed' },
    aside: { type: 'text', default: '9 passed' },
    viewLabel: { type: 'text', default: 'View' },
    items: {
      type: 'list',
      of: {
        key: { type: 'text' },
        label: { type: 'text', default: 'contract' },
        reason: { type: 'text', default: 'Composition failed.' },
        detail: { type: 'text' },
      },
      default: CHECK_FAILURES,
    },
  }),
  render: v => (
    <FailureCard
      title={v.title}
      aside={v.aside}
      viewLabel={v.viewLabel}
      items={v.items.map(item => ({ ...item, onView: () => {} }))}
    />
  ),
});
