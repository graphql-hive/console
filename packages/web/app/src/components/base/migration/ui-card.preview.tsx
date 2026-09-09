import { type ReactNode } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  ActivityIcon,
  BookIcon,
  CircleHelpIcon,
  FrownIcon,
  GaugeIcon,
  GlobeIcon,
  HistoryIcon,
  Lock,
  PercentIcon,
  SmartphoneIcon,
  SmileIcon,
} from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { FaRegUserCircle } from 'react-icons/fa';
import { SiGithub, SiGoogle, SiOkta } from 'react-icons/si';
import AutoSizer from 'react-virtualized-auto-sizer';
import { AuthCard, AuthCardStack, AuthOrSeparator } from '@/components/auth';
import { ProjectCard, ProjectCard_ProjectFragment } from '@/components/organization/project-card';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { makeFragmentData } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { cn } from '@/lib/utils';

export const nav: NavPath = 'Migration/Card/ui-card';

/**
 * Every `@/components/ui/card` call site: 11 files, 34 Card elements.
 *
 * Temporary scaffolding for the Card consolidation. Delete this file, its sibling
 * `v2-card.preview.tsx`, and the `Migration` nav group once ui/card is gone.
 *
 * ui/card's defaults, for reference when reading these:
 *   Card         text-neutral-11 bg-neutral-2 dark:bg-neutral-3 border-neutral-4 rounded-lg border shadow-sm
 *   CardHeader   flex cursor-default flex-col space-y-1.5 p-6
 *   CardTitle    h3, text-neutral-12 cursor-default text-lg font-medium leading-none
 *   CardDescription  p, text-neutral-11 cursor-default text-sm
 *   CardContent  p-6 pt-0
 *   CardFooter   flex items-center p-6 pt-0
 *
 * Components are imported where that is possible; page-level call sites are transcribed, since
 * they mount urql, react-hook-form or Formik. `EmptyList` is transcribed despite being a
 * component, because it imports `DocsLink`, which reaches `@/env/frontend` and throws here.
 * Parent containers are reproduced too: layout context is where the differences show up.
 */

const DAY = 86_400_000;

function series(days: number, peak: number): [string, number][] {
  const start = Date.UTC(2026, 8, 1);
  return Array.from({ length: days }, (_, i) => [
    new Date(start + i * DAY).toISOString(),
    Math.max(0, Math.round(peak * (0.55 + 0.45 * Math.sin(i / 3)) - i * (peak / 200))),
  ]);
}

/** The stat tile, 16 of the 34 cards. Only title, icon, value and caption vary. */
function StatTile(props: {
  title: string;
  titleClass?: string;
  icon: ReactNode;
  value: ReactNode;
  caption: string;
  headerTitleAttr?: string;
}) {
  return (
    <Card className="bg-neutral-2/50">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 pb-2"
        title={props.headerTitleAttr}
      >
        <CardTitle className={cn('text-sm font-medium', props.titleClass)}>{props.title}</CardTitle>
        {props.icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{props.value}</div>
        <p className="text-neutral-10 text-xs">{props.caption}</p>
      </CardContent>
    </Card>
  );
}

const icon = (Icon: typeof GlobeIcon) => <Icon className="text-neutral-10 size-4" />;

/** The scrolling list body shared by the Operations / Clients / Versions / Errors cards. */
function ListRows(props: {
  rows: { label: string; count: number; pct: number }[];
  link?: boolean;
}) {
  return (
    <>
      {props.rows.map(row => (
        <div
          key={row.label}
          className={cn(
            'flex items-center py-1',
            props.link &&
              'text-neutral-11 hover:text-neutral-11 hover:bg-neutral-4 -mx-2 rounded-md px-2 hover:underline hover:underline-offset-2',
          )}
        >
          <p className="truncate text-sm font-medium">{row.label}</p>
          <div className="ml-auto flex min-w-[150px] flex-row items-center justify-end text-sm font-light">
            <div>{row.count.toLocaleString()}</div>
            <div className="min-w-[70px] text-right">{row.pct}%</div>
          </div>
        </div>
      ))}
    </>
  );
}

const OPERATIONS = [
  { label: 'getUserProfile', count: 482_100, pct: 38.4 },
  { label: 'listProjects', count: 301_442, pct: 24.0 },
  { label: 'searchSchemaCoordinates', count: 188_900, pct: 15.1 },
  { label: 'getTargetInsights', count: 122_540, pct: 9.8 },
  { label: 'updateAlertRule', count: 88_120, pct: 7.0 },
  { label: 'deleteAccessToken', count: 71_300, pct: 5.7 },
];

const ACTIVITY_OPTION = {
  grid: { left: 20, top: 20, right: 20, bottom: 20, containLabel: true },
  tooltip: { trigger: 'axis' },
  xAxis: [{ type: 'time' }],
  yAxis: [
    { type: 'value', min: 0, splitLine: { lineStyle: { color: '#595959', type: 'dashed' } } },
  ],
  series: [
    {
      type: 'line',
      name: 'Requests',
      showSymbol: false,
      color: '#f4b740',
      areaStyle: {},
      data: series(30, 180_000),
    },
  ],
};

// ---------------------------------------------------------------------------
// components/auth.tsx
// AuthCard wraps ui/card with `mx-auto w-full md:max-w-md` and puts `text-2xl` on the title.
// It carries data-cy on BOTH title and description; e2e/specs/app.spec.ts:161 asserts on the
// description one, so that attribute has to survive the migration.
// ---------------------------------------------------------------------------

function Providers(props: { verb: 'Login with' | 'Sign up with'; disabled?: boolean }) {
  return (
    <>
      <Button variant="outline" className="w-full" disabled={props.disabled}>
        <SiGoogle className="mr-4 size-4" /> {props.verb} Google
      </Button>
      <Button variant="outline" className="w-full" disabled={props.disabled}>
        <SiGithub className="mr-4 size-4" /> {props.verb} Github
      </Button>
      <Button variant="outline" className="w-full" disabled={props.disabled}>
        <SiOkta className="mr-4 size-4" /> {props.verb} Okta
      </Button>
      <Button variant="outline" className="w-full" disabled={props.disabled}>
        <FaRegUserCircle className="mr-4 size-4" /> {props.verb} SSO
      </Button>
    </>
  );
}

function Field(props: {
  label: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center">
        <Label>{props.label}</Label>
        {props.children}
      </div>
      <Input placeholder={props.placeholder} type={props.type} disabled={props.disabled} readOnly />
    </div>
  );
}

function SignInForm(props: { submitLabel: string; disabled?: boolean; providers?: boolean }) {
  return (
    <AuthCardStack>
      <form className="grid gap-4">
        <Field label="Email" placeholder="m@example.com" type="email" disabled={props.disabled} />
        <Field label="Password" type="password" disabled={props.disabled}>
          <a href="#preview" className="ml-auto inline-block text-sm underline">
            Forgot your password?
          </a>
        </Field>
        <Button className="w-full" disabled={props.disabled}>
          {props.submitLabel}
        </Button>
      </form>
      {props.providers ? <AuthOrSeparator /> : null}
      {props.providers ? <Providers verb="Login with" disabled={props.disabled} /> : null}
    </AuthCardStack>
  );
}

export const AuthSignIn = createPreview({
  label: 'auth.tsx - sign in',
  render: () => (
    <AuthCard
      title="Login"
      description="Sign in to your account"
      content={<SignInForm submitLabel="Sign in" providers />}
    />
  ),
});

export const AuthSignInSubmitting = createPreview({
  label: 'auth.tsx - sign in (submitting)',
  render: () => (
    <AuthCard
      title="Login"
      description="Sign in to your account"
      content={<SignInForm submitLabel="Signing in..." disabled providers />}
    />
  ),
});

/** `enabledProviders.length` is 0, so the separator and provider buttons are dropped. */
export const AuthSignInNoProviders = createPreview({
  label: 'auth.tsx - sign in (no providers)',
  render: () => (
    <AuthCard
      title="Login"
      description="Sign in to your account"
      content={<SignInForm submitLabel="Sign in" />}
    />
  ),
});

export const AuthSignUp = createPreview({
  label: 'auth.tsx - sign up',
  render: () => (
    <AuthCard
      title="Register"
      description="Enter your information to create an account"
      content={
        <AuthCardStack>
          <form className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First name" placeholder="Max" />
              <Field label="Last name" placeholder="Robinson" />
            </div>
            <Field label="Email" placeholder="m@example.com" type="email" />
            <Field label="Password" type="password" />
            <Button className="w-full">Create an account</Button>
          </form>
          <AuthOrSeparator />
          <Providers verb="Sign up with" />
        </AuthCardStack>
      }
    />
  ),
});

export const AuthSSO = createPreview({
  label: 'auth.tsx - SSO',
  render: () => (
    <AuthCard
      title="Login with SSO"
      description="Sign in to your account with an organization slug"
      content={
        <>
          <AuthCardStack>
            <form className="grid gap-4">
              <Field label="Organization slug" placeholder="acme">
                <CircleHelpIcon className="text-neutral-10 ml-2 size-4" />
              </Field>
              <Button className="w-full">Sign in</Button>
            </form>
          </AuthCardStack>
          <div className="mt-4 text-center text-sm">
            <a href="#preview" className="underline">
              Back to other sign-in options
            </a>
          </div>
        </>
      }
    />
  ),
});

export const AuthResetPassword = createPreview({
  label: 'auth.tsx - reset password',
  render: () => (
    <AuthCard
      title="Reset your password"
      description="We will send you an email to reset your password"
      content={
        <form className="grid gap-4">
          <Field label="Email" placeholder="m@example.com" type="email" />
          <Button className="w-full">Email me</Button>
        </form>
      }
    />
  ),
});

/** Title with no description: the header's other shape. */
export const AuthEmailSent = createPreview({
  label: 'auth.tsx - email sent',
  render: () => (
    <AuthCard
      title="Email sent"
      content={
        <AuthCardStack>
          <p>
            A password reset email has been sent to{' '}
            <span className="font-semibold">m@example.com</span>, if it exists in our system.
          </p>
          <p className="text-neutral-10 text-sm">
            If you don't receive an email, try to{' '}
            <a href="#preview" className="underline">
              reset your password again
            </a>
            .
          </p>
        </AuthCardStack>
      }
    />
  ),
});

export const AuthVerifyEmail = createPreview({
  label: 'auth.tsx - verify email',
  render: () => (
    <AuthCard
      title="Verify your email address"
      content={
        <AuthCardStack>
          <p>
            <span className="font-semibold">Please click on the link</span> in the email we just
            sent you to confirm your email address.
          </p>
          <Button className="w-full">Resend verification email</Button>
          <Button className="w-full" variant="outline">
            Logout
          </Button>
        </AuthCardStack>
      }
    />
  ),
});

/** The only card in the app with a spinner in its body. */
export const AuthVerifying = createPreview({
  label: 'auth.tsx - verifying',
  render: () => (
    <AuthCard
      title="Verifying your email address"
      description="This should only take a few seconds."
      content={
        <AuthCardStack>
          <div className="flex justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-t-[#3c3c3c]" />
          </div>
        </AuthCardStack>
      }
    />
  ),
});

/** Header-only: no content beneath. The OIDC and OAuth callback screens are all this shape. */
export const AuthHeaderOnly = createPreview({
  label: 'auth.tsx - header only (redirects)',
  render: () => (
    <div className="flex flex-col gap-6">
      <AuthCard
        title="Starting OIDC Login Flow"
        description="You are being redirected to your OIDC provider."
      />
      <AuthCard title="OIDC Login Flow Failed" description="Request failed with status code 400" />
      <AuthCard
        title="Continuing Google Authentication"
        description="Your are being redirected to Hive Console."
      />
      <AuthCard
        title="Github Authentication Failed"
        description="Request failed with status code 401"
      />
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/organization/project-card.tsx
// The real component, with makeFragmentData standing in for the query result. It is checked
// against the fragment, so adding a field there breaks this fixture rather than drifting.
// ---------------------------------------------------------------------------

const project = (slug: string, type: ProjectType) =>
  makeFragmentData(
    { __typename: 'Project' as const, id: `project-${slug}`, slug, type },
    ProjectCard_ProjectFragment,
  );

const requestSeries = (days: number, peak: number) =>
  series(days, peak).map(([date, value]) => ({ date, value }));

export const ProjectCards = createPreview({
  label: 'project-card.tsx',
  render: () => (
    <div className="grid w-[64rem] grid-cols-2 items-stretch gap-5 xl:grid-cols-3">
      <ProjectCard
        project={project('graphql-hive', ProjectType.Federation)}
        cleanOrganizationId="the-guild"
        highestNumberOfRequests={180_000}
        requestsOverTime={requestSeries(14, 180_000)}
        schemaVersionsCount={42}
        days={14}
      />
      <ProjectCard
        project={project('codegen', ProjectType.Single)}
        cleanOrganizationId="the-guild"
        highestNumberOfRequests={180_000}
        requestsOverTime={requestSeries(14, 24_000)}
        schemaVersionsCount={7}
        days={14}
      />
      <ProjectCard
        project={project('mesh', ProjectType.Stitching)}
        cleanOrganizationId="the-guild"
        highestNumberOfRequests={180_000}
        requestsOverTime={requestSeries(14, 900)}
        schemaVersionsCount={1}
        days={14}
      />
    </div>
  ),
});

/** `project` null: skeleton bars replace the title, type and both stat rows. */
export const ProjectCardsLoading = createPreview({
  label: 'project-card.tsx (loading)',
  render: () => (
    <div className="grid w-[64rem] grid-cols-2 items-stretch gap-5 xl:grid-cols-3">
      {[0, 1, 2, 3].map(i => (
        <ProjectCard
          key={i}
          project={null}
          cleanOrganizationId={null}
          highestNumberOfRequests={10}
          requestsOverTime={null}
          schemaVersionsCount={null}
          days={14}
        />
      ))}
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/ui/empty-list.tsx
// Transcribed rather than imported: it pulls DocsLink, which reaches @/env/frontend.
// ---------------------------------------------------------------------------

export const EmptyList = createPreview({
  label: 'empty-list.tsx',
  render: () => (
    <div className="w-[52rem]">
      <Card
        className="flex max-h-screen min-h-[400px] grow cursor-default flex-col items-center gap-y-2 p-4"
        data-cy="empty-list"
      >
        <div className="bg-neutral-4 size-[200px] rounded-full" />
        <Heading className="text-center">No schemas found</Heading>
        <span className="text-neutral-10 text-center text-sm font-medium">
          Publish your first schema to get started.
        </span>
        <a href="#preview" className="text-neutral-10 mt-2 text-sm underline">
          Read more in the documentation
        </a>
      </Card>
    </div>
  ),
});

/** The `NoSchemaVersion` preset injects a code block as children. */
export const EmptyListWithChildren = createPreview({
  label: 'empty-list.tsx (NoSchemaVersion)',
  render: () => (
    <div className="w-[52rem]">
      <Card
        className="flex max-h-screen min-h-[400px] grow cursor-default flex-col items-center gap-y-2 p-4"
        data-cy="empty-list"
      >
        <div className="bg-neutral-4 size-[200px] rounded-full" />
        <Heading className="text-center">No schema version</Heading>
        <span className="text-neutral-10 text-center text-sm font-medium">
          Publish your first schema version to see it here.
        </span>
        <pre className="bg-neutral-1 text-neutral-11 mt-2 rounded-md px-4 py-2 font-mono text-sm">
          hive schema:publish schema.graphql
        </pre>
        <div className="text-neutral-10 flex w-full justify-center py-2 text-xs">
          Run this from your project root.
        </div>
      </Card>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/target/insights/stats.tsx
// Eight tiles from seven components, in a lg:grid-cols-4 grid. Two carry a coloured title.
// ---------------------------------------------------------------------------

export const InsightsStats = createPreview({
  label: 'stats.tsx',
  render: () => (
    <div className="grid w-[68rem] gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatTile
        title="Requests"
        icon={icon(GlobeIcon)}
        value="1.4M"
        caption="Total requests served"
      />
      <StatTile
        title="Requests per minute"
        icon={icon(ActivityIcon)}
        value="1.2k"
        caption="Throughput in last 7 days"
      />
      <StatTile
        title="Operations"
        icon={icon(BookIcon)}
        value="212"
        caption="Distinct GraphQL operations in last 7 days"
      />
      <StatTile
        title="Relative Request Frequency"
        icon={icon(PercentIcon)}
        value="18.4%"
        caption="The impact on the overall API traffic"
      />
      <StatTile
        title="Success rate"
        titleClass="text-emerald-500"
        icon={icon(SmileIcon)}
        value="99.2%"
        caption="Successful requests in last 7 days"
      />
      <StatTile
        title="p99"
        icon={icon(GaugeIcon)}
        value="124ms"
        caption="Latency p99 in last 7 days"
      />
      <StatTile
        title="p95"
        icon={icon(GaugeIcon)}
        value="88ms"
        caption="Latency p95 in last 7 days"
      />
      <StatTile
        title="Failure rate"
        titleClass="text-red-500"
        icon={icon(FrownIcon)}
        value="0.8%"
        caption="Failed requests in last 7 days"
      />
    </div>
  ),
});

/** Rate tiles fall back to '-' when there are no requests at all. */
export const InsightsStatsEmpty = createPreview({
  label: 'stats.tsx (no traffic)',
  render: () => (
    <div className="grid w-[68rem] gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatTile title="Requests" icon={icon(GlobeIcon)} value="0" caption="Total requests served" />
      <StatTile
        title="Success rate"
        titleClass="text-emerald-500"
        icon={icon(SmileIcon)}
        value="-"
        caption="Successful requests in last 7 days"
      />
      <StatTile
        title="Failure rate"
        titleClass="text-red-500"
        icon={icon(FrownIcon)}
        value="-"
        caption="Failed requests in last 7 days"
      />
      <StatTile
        title="Relative Request Frequency"
        icon={icon(PercentIcon)}
        value="-"
        caption="The impact on the overall API traffic"
      />
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/target-insights-client.tsx - 7 cards
// Four tiles in a nested grid, an Activity card beside them, then Operations (col-span-4)
// and Versions (col-span-3) in a lg:grid-cols-7 row.
// ---------------------------------------------------------------------------

export const InsightsClient = createPreview({
  label: 'target-insights-client.tsx',
  render: () => (
    <div className="w-[72rem] space-y-4 pb-8">
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-8">
        <div className="col-span-4">
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-2">
            <StatTile
              title="Total calls"
              icon={icon(GlobeIcon)}
              value="482,100"
              caption="Requests in last 7 days"
            />
            <StatTile
              title="Requests per minute"
              icon={icon(ActivityIcon)}
              value="1.2k"
              caption="RPM in last 7 days"
            />
            <StatTile
              title="Operations"
              icon={icon(BookIcon)}
              value="24"
              caption="Documents requested by selected client"
            />
            <StatTile
              title="Versions"
              icon={icon(HistoryIcon)}
              value="6"
              caption="Versions in last 7 days"
            />
          </div>
        </div>
        <div className="col-span-4">
          <Card className="bg-neutral-2/50 flex h-full flex-col">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>GraphQL requests from web-app over time</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[150px] grow basis-0">
              <AutoSizer>
                {size => (
                  <ReactECharts
                    style={{ width: size.width, height: size.height }}
                    option={ACTIVITY_OPTION}
                  />
                )}
              </AutoSizer>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="bg-neutral-2/50 col-span-4 flex h-full flex-col">
          <CardHeader>
            <CardTitle>Operations</CardTitle>
            <CardDescription>web-app requested 24 operations in last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[120px] grow basis-0 overflow-y-auto">
            <ListRows rows={OPERATIONS} link />
          </CardContent>
        </Card>

        <Card className="bg-neutral-2/50 col-span-3 flex h-full flex-col">
          <CardHeader>
            <CardTitle>Versions</CardTitle>
            <CardDescription>
              web-app had 31 versions in last 7 days. Displaying only 25 most popular versions
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[170px] grow basis-0 overflow-y-auto">
            <ListRows
              rows={[
                { label: '2.14.0', count: 210_400, pct: 43.6 },
                { label: '2.13.2', count: 140_100, pct: 29.1 },
                { label: '2.13.1', count: 88_020, pct: 18.3 },
                { label: '2.12.0', count: 43_580, pct: 9.0 },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/target-insights-coordinate.tsx - 10 cards, the largest call site
// Two things here exist nowhere else: a raw HTML `title` attribute on a CardHeader (the
// Total resolutions tooltip), and a Card with TWO header/content pairs (Activity).
// Four of the ten are gated on `showFieldLevelMetrics`.
// ---------------------------------------------------------------------------

const RESOLUTION_TOOLTIP =
  'Resolution Count is the total number of times this specific field (schema coordinate) was executed and returned.\n\nThis differs from Request Count because a single request can resolve a field multiple times (e.g., inside an array) or skip it entirely (due to errors or conditional directives).';

function CoordinatePage(props: { fieldLevelMetrics: boolean }) {
  return (
    <div className="w-[72rem] space-y-4 pb-8">
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-8">
        <div className="col-span-4">
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-2">
            <StatTile
              title="Total calls"
              icon={icon(GlobeIcon)}
              value="482,100"
              caption="Requests in last 7 days"
            />
            {props.fieldLevelMetrics ? (
              <StatTile
                title="Total resolutions"
                icon={icon(GlobeIcon)}
                headerTitleAttr={RESOLUTION_TOOLTIP}
                value={
                  <>
                    1,204,880
                    <span className="ml-2 text-sm font-normal text-red-500">(3,120 errors)</span>
                  </>
                }
                caption="Resolved in last 7 days"
              />
            ) : null}
            <StatTile
              title="Requests per minute"
              icon={icon(ActivityIcon)}
              value="1.2k"
              caption="RPM in last 7 days"
            />
            <StatTile
              title="Operations"
              icon={icon(BookIcon)}
              value="18"
              caption="GraphQL documents with selected coordinate"
            />
            <StatTile
              title="Consumers"
              icon={icon(SmartphoneIcon)}
              value="7"
              caption="GraphQL clients in last 7 days"
            />
          </div>
        </div>

        <div className="col-span-4">
          <Card className="bg-neutral-2/50 flex h-full flex-col">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>GraphQL requests with Query.products over time</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[150px] grow basis-0">
              <AutoSizer>
                {size => (
                  <ReactECharts
                    style={{ width: size.width, height: size.height }}
                    option={ACTIVITY_OPTION}
                  />
                )}
              </AutoSizer>
            </CardContent>
            <CardHeader className="pt-0">
              <CardDescription>
                Number of times the coordinate Query.products has resolved over time
              </CardDescription>
            </CardHeader>
            <CardContent
              className={cn(
                'min-h-[150px] grow basis-0',
                props.fieldLevelMetrics ? 'show' : 'hidden',
              )}
            >
              <AutoSizer>
                {size => (
                  <ReactECharts
                    style={{ width: size.width, height: size.height }}
                    option={ACTIVITY_OPTION}
                  />
                )}
              </AutoSizer>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="bg-neutral-2/50 col-span-4 flex h-full flex-col">
          <CardHeader>
            <CardTitle>Operations</CardTitle>
            <CardDescription>
              Query.products was used by 18 operations in last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[120px] grow basis-0 overflow-y-auto">
            <ListRows rows={OPERATIONS} link />
          </CardContent>
        </Card>

        <Card className="bg-neutral-2/50 col-span-3 flex h-full flex-col">
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Query.products was used by 7 clients in last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[170px] grow basis-0 overflow-y-auto">
            <ListRows
              rows={[
                { label: 'web-app', count: 288_400, pct: 59.8 },
                { label: 'ios', count: 102_100, pct: 21.2 },
                { label: 'android', count: 61_200, pct: 12.7 },
                { label: 'cli', count: 30_400, pct: 6.3 },
              ]}
              link
            />
          </CardContent>
        </Card>

        {props.fieldLevelMetrics ? (
          <>
            <Card className="bg-neutral-2/50 col-span-3 flex h-full flex-col">
              <CardHeader>
                <CardTitle>Errors</CardTitle>
                <CardDescription>
                  Query.products resulted in a GraphQL error 3,120 times in last 7 days.
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[170px] grow basis-0 overflow-y-auto">
                <div className="space-y-2">
                  <ListRows
                    rows={[
                      { label: 'INTERNAL_SERVER_ERROR', count: 1820, pct: 58.3 },
                      { label: 'UNAUTHENTICATED', count: 780, pct: 25.0 },
                      { label: 'BAD_USER_INPUT', count: 520, pct: 16.7 },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-2/50 col-span-4 flex h-full flex-col">
              <CardHeader>
                <CardTitle>Error Activity</CardTitle>
                <CardDescription>Error codes returned by Query.products over time</CardDescription>
              </CardHeader>
              <CardContent className="min-h-[170px] grow basis-0 overflow-y-auto">
                <AutoSizer>
                  {size => (
                    <ReactECharts
                      style={{ width: size.width, height: size.height }}
                      option={{
                        grid: { left: 20, top: 20, right: 20, bottom: 20, containLabel: true },
                        tooltip: { trigger: 'axis' },
                        xAxis: [{ type: 'time' }],
                        yAxis: [{ type: 'value', min: 0 }],
                        series: [
                          {
                            type: 'bar',
                            stack: 'errors',
                            name: 'INTERNAL_SERVER_ERROR',
                            color: '#ef4444',
                            data: series(14, 1800),
                          },
                          {
                            type: 'bar',
                            stack: 'errors',
                            name: 'UNAUTHENTICATED',
                            color: '#f59e0b',
                            data: series(14, 760),
                          },
                        ],
                      }}
                    />
                  )}
                </AutoSizer>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}

export const InsightsCoordinate = createPreview({
  label: 'target-insights-coordinate.tsx',
  render: () => <CoordinatePage fieldLevelMetrics />,
});

/** Without field-level metrics four of the ten cards disappear and the grid reflows. */
export const InsightsCoordinateNoFieldMetrics = createPreview({
  label: 'target-insights-coordinate.tsx (no field metrics)',
  render: () => <CoordinatePage fieldLevelMetrics={false} />,
});

// ---------------------------------------------------------------------------
// pages/target-insights-manage-filters.tsx
// The plainest cards in the app: a muted small title and a number, no icon.
// ---------------------------------------------------------------------------

function StatCard(props: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-neutral-10 text-sm font-medium">{props.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{props.value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

export const ManageFilters = createPreview({
  label: 'target-insights-manage-filters.tsx',
  render: () => (
    <div className="grid w-[52rem] grid-cols-3 gap-4">
      <StatCard label="Total Filters" value={18} />
      <StatCard label="Shared Filters" value={7} />
      <StatCard label="Total Views" value={1284} />
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/project-alerts.tsx
// Two stacked cards, both header/content/footer. The Channels card renders its modal
// INSIDE the Card, after the footer.
// ---------------------------------------------------------------------------

export const ProjectAlerts = createPreview({
  label: 'project-alerts.tsx',
  render: () => (
    <div className="flex w-[52rem] flex-col gap-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
          <CardDescription>
            Alert Channels are a way to configure <strong>how</strong> you want to receive alerts
            and notifications from Hive.
            <br />
            <a href="#preview" className="underline">
              Learn more
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-neutral-11 divide-neutral-4 divide-y text-sm">
            <div className="flex justify-between py-2">
              <span>#eng-alerts</span>
              <span className="text-neutral-10">Slack</span>
            </div>
            <div className="flex justify-between py-2">
              <span>ops@example.com</span>
              <span className="text-neutral-10">Email</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="mt-4 flex gap-x-2">
            <Button variant="default">Add channel</Button>
            <Button variant="destructive">Delete</Button>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts and Notifications</CardTitle>
          <CardDescription>
            Alerts are a way to configure <strong>when</strong> you want to receive alerts and
            notifications from Hive.
            <br />
            <a href="#preview" className="underline">
              Learn more
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-neutral-11 divide-neutral-4 divide-y text-sm">
            <div className="flex justify-between py-2">
              <span>Schema change notifications</span>
              <span className="text-neutral-10">production</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex gap-x-2">
            <Button variant="default">Create alert</Button>
            <Button variant="destructive">Delete</Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/organization-join.tsx - two mutually exclusive branches
// The success branch has the only responsive CardFooter in the app.
// ---------------------------------------------------------------------------

export const OrganizationJoin = createPreview({
  label: 'organization-join.tsx',
  render: () => (
    <div className="container w-[40rem]">
      <div className="bg-neutral-1">
        <Card>
          <CardHeader>
            <CardTitle>Join "acme-corp" organization</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              You've been invited to become a member of{' '}
              <span className="font-semibold">acme-corp</span>.
            </p>
            <p className="text-neutral-10 mt-2">
              By accepting the invitation, you will be able to collaborate with other members of
              this organization.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-y-4 md:flex-row md:justify-evenly md:gap-x-4 md:gap-y-0">
            <Button className="w-full md:flex-1" variant="outline">
              Ignore
            </Button>
            <Button className="w-full md:flex-1">Accept</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  ),
});

export const OrganizationJoinError = createPreview({
  label: 'organization-join.tsx (error)',
  render: () => (
    <div className="container w-[40rem]">
      <div className="bg-neutral-1">
        <Card>
          <CardHeader>
            <CardTitle>Invitation Error</CardTitle>
          </CardHeader>
          <CardContent>Invitation expired</CardContent>
          <CardFooter>
            <Button className="w-full">Back to Hive</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/organization-new.tsx
// ---------------------------------------------------------------------------

export const OrganizationNew = createPreview({
  label: 'organization-new.tsx',
  render: () => (
    <div className="container w-[32rem] max-w-[520px]">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create an organization</CardTitle>
          <CardDescription>
            An organization is built on top of <b>Projects</b>. You will become an <b>admin</b> and
            don't worry, you can add members later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="my-organization" readOnly />
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" variant="default">
            Create Organization
          </Button>
        </CardFooter>
      </Card>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/organization-oidc-request.tsx
// A centred panel with a fixed min height, no header/content sub-components at all.
// ---------------------------------------------------------------------------

export const OIDCRequest = createPreview({
  label: 'organization-oidc-request.tsx',
  render: () => (
    <div className="w-[52rem]">
      <Card className="min-h-140 my-6 flex flex-col items-center justify-center gap-y-6 p-5">
        <Lock className="size-20 stroke-amber-400" />
        <div className="flex flex-col gap-y-2 text-center">
          <Heading>Single sign-on</Heading>
          <span className="text-neutral-10 text-center text-sm font-medium">
            To access the organization's resources, authenticate your account with single sign-on.
          </span>
        </div>
        <Button className="min-w-32">Continue</Button>
      </Card>
    </div>
  ),
});
