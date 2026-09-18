import { createPreview, type NavPath } from 'react-foundry';
import { Badge } from '../badge/badge';
import { DescriptionList } from './description-list';

export const nav: NavPath = 'Base/DescriptionList';

export const Default = createPreview(() => (
  <div className="w-[36rem]">
    <DescriptionList
      rows={[
        {
          items: [
            { term: 'Metric', description: 'p99 latency' },
            { term: 'Threshold', description: '500ms' },
          ],
        },
        {
          items: [
            { term: 'Window', description: 'Last 15 minutes' },
            { term: 'Evaluated every', description: '5 minutes' },
          ],
        },
      ]}
    />
  </div>
));

/** Column count is derived per row from `items.length`, so rows can differ. */
export const MixedColumns = createPreview(() => (
  <div className="w-[36rem]">
    <DescriptionList
      rows={[
        { items: [{ term: 'Name', description: 'P99 latency spike' }] },
        {
          items: [
            { term: 'Metric', description: 'p99 latency' },
            { term: 'Threshold', description: '500ms' },
            { term: 'Window', description: '15m' },
          ],
        },
        {
          items: [
            { term: 'Created', description: '3 Aug 2026' },
            { term: 'Created by', description: 'user@the-guild.dev' },
          ],
        },
      ]}
    />
  </div>
));

/** `description` takes a ReactNode, so cells can hold components rather than text. */
export const RichDescriptions = createPreview(() => (
  <div className="w-[36rem]">
    <DescriptionList
      rows={[
        {
          items: [
            { term: 'Target', description: <code className="text-control">production</code> },
            {
              term: 'Status',
              description: <Badge content="Active" variants={{ variant: 'secondary' }} />,
            },
          ],
        },
        {
          items: [
            {
              term: 'Channels',
              description: (
                <div className="flex flex-wrap gap-1.5">
                  <Badge content="Slack" variants={{ variant: 'outline' }} />
                  <Badge content="Webhook" variants={{ variant: 'outline' }} />
                  <Badge content="Email" variants={{ variant: 'outline' }} />
                </div>
              ),
            },
          ],
        },
      ]}
    />
  </div>
));

/**
 * `mono` for identifiers, `copyable` for values the reader pastes somewhere, and `attrs` lands on
 * the value element for a test hook.
 */
export const CopyableValues = createPreview(() => (
  <div className="w-[36rem]">
    <DescriptionList
      rows={[
        {
          items: [
            {
              term: 'Sign-in redirect URI',
              description: 'https://app.graphql-hive.com/auth/callback/oidc',
              mono: true,
              copyable: true,
              attrs: { 'data-oidc-property-sign-in-redirect-uri': '' },
            },
          ],
        },
        {
          items: [
            { term: 'Type', description: 'TXT', mono: true, copyable: true },
            {
              term: 'Name',
              description: '_hive-challenge.example.com',
              mono: true,
              copyable: true,
            },
            {
              term: 'Value',
              description: 'hive-domain-verification=3af771c7',
              mono: true,
              copyable: true,
            },
          ],
        },
      ]}
    />
  </div>
));

/** A term that needs explaining carries it on an info icon. */
export const TermTooltips = createPreview(() => (
  <div className="w-[36rem]">
    <DescriptionList
      rows={[
        {
          items: [
            {
              term: 'User ID Claim',
              tooltip: 'The claim that should be used to uniquely identify an user.',
              description: 'sub',
              mono: true,
            },
            {
              term: 'Additional Scopes',
              tooltip: 'Additional scopes that are requested from the OIDC provider.',
              description: <span className="text-neutral-8">none</span>,
            },
          ],
        },
      ]}
    />
  </div>
));

export const SingleColumn = createPreview(() => (
  <div className="w-80">
    <DescriptionList
      rows={[
        { items: [{ term: 'Organization', description: 'the-guild' }] },
        { items: [{ term: 'Project', description: 'hive-console' }] },
        { items: [{ term: 'Target', description: 'production' }] },
      ]}
    />
  </div>
));
