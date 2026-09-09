import ReactECharts from 'echarts-for-react';
import { Globe, History } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/v2/card';
import { pluralize } from '@/lib/utils';
import { Link } from '@tanstack/react-router';

export const nav: NavPath = 'Migration/Card/v2-card';

/**
 * Every `@/components/v2/card` call site: 5 files, 9 Card elements.
 *
 * Temporary scaffolding for the Card consolidation. Delete this file, its sibling
 * `ui-card.preview.tsx`, and the `Migration` nav group once v2/card is gone.
 *
 * v2's Card is `forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { asChild?: boolean }>`
 * with base classes `border-neutral-5 rounded-md border p-5`. Note the padding sits on the root,
 * unlike ui/card where it lives on the header and content.
 *
 * Page-level call sites are transcribed rather than imported, since they mount urql and
 * react-hook-form. Parent containers are reproduced too: layout context is where the differences
 * show up.
 */

const DAY = 86_400_000;

/** Request volume shaped like a real target rather than a flat line. */
function series(days: number, peak: number): [string, number][] {
  const start = Date.UTC(2026, 8, 1);
  return Array.from({ length: days }, (_, i) => [
    new Date(start + i * DAY).toISOString(),
    Math.max(0, Math.round(peak * (0.55 + 0.45 * Math.sin(i / 3)) - i * (peak / 200))),
  ]);
}

function Stat(props: { label: string; value: string; help: string }) {
  return (
    <div>
      <div className="text-neutral-10 text-sm">{props.label}</div>
      <div className="text-neutral-12 text-2xl font-semibold">{props.value}</div>
      <div className="text-neutral-10 text-xs">{props.help}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// components/ui/not-found.tsx
// Rendered only by organization-support-ticket.tsx when the ticket is missing.
// ---------------------------------------------------------------------------

export const NotFound = createPreview({
  label: 'not-found.tsx',
  render: () => (
    <div className="w-[52rem] py-6">
      <Card className="flex grow cursor-default flex-col items-center gap-y-2" data-cy="empty-list">
        <div className="bg-neutral-4 size-[200px] rounded-full" />
        <Heading className="text-center">Support ticket not found.</Heading>
        <span className="text-neutral-10 text-center text-sm font-medium">
          The support ticket you are looking for does not exist or you do not have access to it.
        </span>
      </Card>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/v2/graphql-block.tsx
// The real body is a Monaco SchemaEditor at height 60vh. Substituted with a <pre> at the
// same height, since Monaco is far too heavy to mount in a preview.
// ---------------------------------------------------------------------------

const SDL = `type Query {
  users(first: Int, after: String): UserConnection!
  user(id: ID!): User
}

type User {
  id: ID!
  email: String!
  displayName: String!
}`;

export const GraphQLBlock = createPreview({
  label: 'graphql-block.tsx',
  render: () => (
    <div className="w-[52rem]">
      <Card>
        <Heading className="mb-4">
          SDL
          <span className="ml-3 text-sm italic">https://api.example.com/graphql</span>
        </Heading>
        <div className="pb-2">
          <pre className="bg-neutral-1 text-neutral-11 h-[60vh] overflow-auto rounded-md p-4 font-mono text-sm">
            {SDL}
          </pre>
        </div>
      </Card>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/organization-subscription.tsx - four stacked cards
// Spacing comes from `mt-8` on each Card, not from the parent, so they are shown together.
// Cards 3 and 4 are conditional on there being usage points / invoices.
// ---------------------------------------------------------------------------

export const Subscription = createPreview({
  label: 'organization-subscription.tsx',
  render: () => (
    <div className="w-[52rem]">
      <Card>
        <Heading className="mb-2">Your current plan</Heading>
        <div>
          <div className="text-neutral-11 mb-4 text-sm">Pro plan, billed monthly.</div>
          <Stat label="Next Invoice" value="$120.00" help="Oct 1, 2026" />
        </div>
      </Card>

      <Card className="mt-8">
        <Heading>Current Usage</Heading>
        <p className="text-neutral-10 text-sm">Sep 1, 2026 - Sep 30, 2026</p>
        <div className="mt-4">
          <div className="text-neutral-11 text-sm">8.4M of 10M operations used</div>
          <div className="bg-neutral-4 mt-2 h-2 w-full rounded-full">
            <div className="bg-accent h-2 w-[84%] rounded-full" />
          </div>
        </div>
      </Card>

      <Card className="mt-8">
        <Heading>Historical Usage</Heading>
        <div className="mt-4">
          <AutoSizer disableHeight>
            {size => (
              <ReactECharts
                style={{ width: size.width, height: 400 }}
                option={{
                  grid: { left: 20, top: 50, right: 20, bottom: 20, containLabel: true },
                  tooltip: { trigger: 'axis' },
                  legend: { show: false },
                  xAxis: [{ type: 'time', splitNumber: 12 }],
                  yAxis: [
                    {
                      type: 'value',
                      min: 0,
                      splitLine: { lineStyle: { color: '#595959', type: 'dashed' } },
                    },
                  ],
                  series: [
                    {
                      type: 'bar',
                      name: 'Events',
                      color: '#595959',
                      data: series(12, 9_000_000),
                    },
                  ],
                }}
              />
            )}
          </AutoSizer>
        </div>
      </Card>

      <Card className="mt-8">
        <Heading>Invoices</Heading>
        <div className="mt-4">
          <div className="text-neutral-11 flex justify-between border-b py-2 text-sm">
            <span>Sep 1, 2026</span>
            <span>$120.00</span>
          </div>
          <div className="text-neutral-11 flex justify-between py-2 text-sm">
            <span>Aug 1, 2026</span>
            <span>$120.00</span>
          </div>
        </div>
      </Card>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/organization-subscription-manage.tsx
// The second Card carries `ref={planSummaryRef}` for a scrollIntoView after a plan change.
// It is the only ref on a Card anywhere in the app.
// ---------------------------------------------------------------------------

export const SubscriptionManage = createPreview({
  label: 'organization-subscription-manage.tsx',
  render: () => (
    <div className="flex w-[52rem] flex-col gap-5">
      <Card className="w-full">
        <Heading className="mb-4">Choose Your Plan</Heading>
        <div className="text-neutral-10 mb-3 text-sm">
          You lack the necessary permission 'billing:update' to update the subscription plan.
        </div>
        <div className="grid grid-cols-3 gap-4">
          {['Hobby', 'Pro', 'Enterprise'].map(name => (
            <div key={name} className="border-neutral-5 rounded-md border p-4">
              <div className="text-neutral-12 font-medium">{name}</div>
              <div className="text-neutral-10 text-sm">
                {name === 'Hobby' ? 'Free' : name === 'Pro' ? '$10 / month' : 'Contact Us'}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="w-full self-start">
        <Heading className="mb-2">Plan Summary</Heading>
        <div>
          <div className="flex flex-col">
            <div className="flex gap-8">
              <Stat label="Base" value="$10" help="per month" />
              <Stat label="Operations" value="1M" help="included" />
              <Stat label="Free Trial" value="30" help="days" />
            </div>
            <div className="my-8 w-1/2">
              <Heading>Define your reserved volume</Heading>
              <p className="text-neutral-10 text-sm">
                Pro plan requires to defined quota of reported operations.
              </p>
              <p className="text-neutral-10 text-sm">
                Pick a volume a little higher than you think you'll need to avoid being rate
                limited.
              </p>
              <p className="text-neutral-10 text-sm">
                Don't worry, you can always adjust it later.
              </p>
              <div className="mt-5 pl-2.5">
                <div className="bg-neutral-4 h-1 w-full rounded-full">
                  <div className="bg-accent h-1 w-1/3 rounded-full" />
                </div>
              </div>
            </div>
            <div>
              <Button type="button">Update Limits</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/project.tsx - TargetCard
// The only `asChild` in the app: the Card collapses onto the Link so the whole surface
// is one click target. Shown in its real grid, which is `items-stretch`.
// ---------------------------------------------------------------------------

function TargetCard(props: { slug: string | null; peak: number; versions: number | null }) {
  const requests = props.slug ? series(14, props.peak) : [];
  const total = requests.reduce((acc, [, value]) => acc + value, 0);

  return (
    <Card
      asChild
      className="hover:bg-neutral-5/40 hover:shadow-neutral-5/50 bg-neutral-2/50 h-full self-start px-0 pt-4 hover:shadow-md"
    >
      <Link
        to="/$organizationSlug/$projectSlug/$targetSlug"
        disabled={props.slug === null}
        params={{
          organizationSlug: 'the-guild',
          projectSlug: 'graphql-hive',
          targetSlug: props.slug ?? 'unknown-yet',
        }}
      >
        <TooltipProvider>
          <div className="flex items-start gap-x-2">
            <div className="grow">
              <div>
                <AutoSizer disableHeight>
                  {size => (
                    <ReactECharts
                      style={{ width: size.width, height: 90 }}
                      option={{
                        animation: !!props.slug,
                        color: ['#f4b740'],
                        grid: { left: 0, top: 10, right: 0, bottom: 10 },
                        tooltip: { trigger: 'axis' },
                        xAxis: { type: 'time', show: false, boundaryGap: false },
                        yAxis: { type: 'value', show: false, min: 0, max: props.peak },
                        series: [
                          {
                            type: 'line',
                            name: 'Requests',
                            smooth: false,
                            showSymbol: false,
                            lineStyle: { width: 2 },
                            areaStyle: { color: 'rgba(244,184,64,0.20)' },
                            data: requests,
                          },
                        ],
                      }}
                    />
                  )}
                </AutoSizer>
              </div>
              <div className="flex flex-row items-center justify-between gap-y-3 px-4 pt-4">
                <div>
                  {props.slug ? (
                    <h4 className="line-clamp-2 text-lg font-bold">{props.slug}</h4>
                  ) : (
                    <div className="bg-neutral-5 h-4 w-48 animate-pulse rounded-full py-2" />
                  )}
                </div>
                <div className="flex flex-col gap-y-2 py-1">
                  {props.slug ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex flex-row items-center gap-x-2">
                            <Globe className="text-neutral-10 size-4" />
                            <div className="text-xs">
                              {total.toLocaleString()} {pluralize(total, 'request', 'requests')}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Number of GraphQL requests in the last 14 days.
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex flex-row items-center gap-x-2">
                            <History className="text-neutral-10 size-4" />
                            <div className="text-xs">
                              {props.versions} {pluralize(props.versions ?? 0, 'commit', 'commits')}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Number of schemas pushed to this project in the last 14 days.
                        </TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <div className="bg-neutral-5 my-1 h-2 w-16 animate-pulse rounded-full" />
                      <div className="bg-neutral-5 my-1 h-2 w-16 animate-pulse rounded-full" />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </Link>
    </Card>
  );
}

export const ProjectTargets = createPreview({
  label: 'project.tsx (asChild)',
  render: () => (
    <div className="grid w-[64rem] grid-cols-2 items-stretch gap-5 xl:grid-cols-3">
      <TargetCard slug="production" peak={52_000} versions={23} />
      <TargetCard slug="staging" peak={8000} versions={11} />
      <TargetCard slug="development" peak={600} versions={4} />
    </div>
  ),
});

/** `target` is null while the query is in flight: four skeleton cards, chart animation off. */
export const ProjectTargetsLoading = createPreview({
  label: 'project.tsx (loading)',
  render: () => (
    <div className="grid w-[64rem] grid-cols-2 items-stretch gap-5 xl:grid-cols-3">
      <TargetCard slug={null} peak={10} versions={null} />
      <TargetCard slug={null} peak={10} versions={null} />
      <TargetCard slug={null} peak={10} versions={null} />
      <TargetCard slug={null} peak={10} versions={null} />
    </div>
  ),
});
