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
            { term: 'Created by', description: 'jon@safetyjon.com' },
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
            { term: 'Target', description: <code className="text-[13px]">production</code> },
            { term: 'Status', description: <Badge variant="secondary">Active</Badge> },
          ],
        },
        {
          items: [
            {
              term: 'Channels',
              description: (
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">Slack</Badge>
                  <Badge variant="outline">Webhook</Badge>
                  <Badge variant="outline">Email</Badge>
                </div>
              ),
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
