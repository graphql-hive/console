import { type ReactNode } from 'react';
import { createPreview, type NavPath } from 'react-foundry';

export const nav: NavPath = 'Migration/Inventory/Card';

/**
 * Every import of every Card module in the app, grouped by the screen that renders it, so each
 * site can be judged against the live thing rather than from a class-string audit.
 *
 * Labels come from greps, not judgement:
 *   renders     - imports `Card` and the file contains `<Card`
 *   sub-parts   - imports CardDescription/CardTitle only, never renders a Card. Suspected misuse.
 *   div         - hand-rolled card-shaped div, no Card import at all
 *
 * Delete this file and the `Migration` nav group when the consolidation lands.
 */

const ORG = 'the-guild';
const PROJECT = 'graphql-hive';
const TARGET = 'production';
const APP = 'https://app.graphql-hive.com';
const T = `${APP}/${ORG}/${PROJECT}/${TARGET}`;

type Label = 'renders' | 'sub-parts' | 'div';

type Site = {
  /** Path relative to packages/web/app/src */
  file: string;
  line: number;
  /** What it pulls out of a Card module, or the classes for a hand-rolled div. */
  imports: string;
  module: 'ui/card' | 'v2/card' | 'base/card' | '-';
  /** Number of `<Card>` elements rendered in the file. */
  cards: number;
  label: Label;
  /** Why it might not be visible when you open the URL. */
  gate?: string;
};

type Screen = {
  name: string;
  /** null when the screen cannot be reached by normal navigation. */
  url: string | null;
  reach?: string;
  sites: Site[];
};

const SCREENS: Screen[] = [
  {
    name: 'Organization overview',
    url: `${APP}/${ORG}`,
    sites: [
      {
        file: 'pages/organization.tsx',
        line: 11,
        imports: 'Card',
        module: 'ui/card',
        cards: 1,
        label: 'renders',
        gate: 'Hand-tuned hover classes; wraps a Link.',
      },
    ],
  },
  {
    name: 'Organization settings - General',
    url: `${APP}/${ORG}/view/settings?page=general`,
    sites: [
      {
        file: 'pages/organization-settings.tsx',
        line: 14,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
        gate: '11 uses, all feeding SubPageLayoutHeader description.',
      },
    ],
  },
  {
    name: 'Organization settings - SSO',
    url: `${APP}/${ORG}/view/settings?page=sso`,
    sites: [
      {
        file: 'components/organization/settings/single-sign-on/single-sign-on-subpage.tsx',
        line: 4,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
      },
      {
        file: 'components/organization/settings/single-sign-on/oidc-integration-configuration.tsx',
        line: 10,
        imports: 'Card, CardContent, CardDescription, CardHeader, CardTitle',
        module: 'base/card',
        cards: 5,
        label: 'renders',
        gate: 'Only when an OIDC integration already exists. The only production user of variant="selectable"/"selected" and CardContent variant="selection".',
      },
    ],
  },
  {
    name: 'Organization settings - Access tokens',
    url: `${APP}/${ORG}/view/settings?page=access-tokens`,
    sites: [
      {
        file: 'components/organization/settings/access-tokens/access-tokens-sub-page.tsx',
        line: 5,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
      },
    ],
  },
  {
    name: 'Organization settings - Personal access tokens',
    url: `${APP}/${ORG}/view/settings?page=personal-access-tokens`,
    sites: [
      {
        file: 'components/organization/settings/personal-access-tokens/personal-access-tokens-sub-page.tsx',
        line: 5,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
      },
    ],
  },
  {
    name: 'Organization members - Invitations',
    url: `${APP}/${ORG}/view/members?page=invitations`,
    sites: [
      {
        file: 'components/organization/members/invitations.tsx',
        line: 17,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
        gate: 'Tab only exists when viewerCanManageInvitations.',
      },
    ],
  },
  {
    name: 'Subscription',
    url: `${APP}/${ORG}/view/subscription`,
    sites: [
      {
        file: 'pages/organization-subscription.tsx',
        line: 17,
        imports: 'Card',
        module: 'v2/card',
        cards: 4,
        label: 'renders',
      },
    ],
  },
  {
    name: 'Manage subscription',
    url: `${APP}/${ORG}/view/manage-subscription`,
    sites: [
      {
        file: 'pages/organization-subscription-manage.tsx',
        line: 17,
        imports: 'Card',
        module: 'v2/card',
        cards: 2,
        label: 'renders',
        gate: 'One Card carries a ref used as a scrollIntoView target.',
      },
    ],
  },
  {
    name: 'Project overview',
    url: `${APP}/${ORG}/${PROJECT}`,
    sites: [
      {
        file: 'pages/project.tsx',
        line: 19,
        imports: 'Card',
        module: 'v2/card',
        cards: 1,
        label: 'renders',
        gate: 'The only asChild usage in the app; wraps a TanStack Link.',
      },
    ],
  },
  {
    name: 'Project settings - General',
    url: `${APP}/${ORG}/${PROJECT}/view/settings?page=general`,
    sites: [
      {
        file: 'pages/project-settings.tsx',
        line: 12,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
        gate: '6 uses.',
      },
    ],
  },
  {
    name: 'Project settings - Composition',
    url: `${APP}/${ORG}/${PROJECT}/view/settings?page=composition`,
    sites: [
      {
        file: 'components/project/settings/composition.tsx',
        line: 3,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
        gate: 'Tab only exists when project.type === Federation.',
      },
    ],
  },
  {
    name: 'Project settings - Access tokens',
    url: `${APP}/${ORG}/${PROJECT}/view/settings?page=access-tokens`,
    sites: [
      {
        file: 'components/project/settings/access-tokens/project-access-tokens-sub-page.tsx',
        line: 5,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
        gate: 'Tab only exists when viewerCanManageProjectAccessTokens.',
      },
    ],
  },
  {
    name: 'Project alerts',
    url: `${APP}/${ORG}/${PROJECT}/view/alerts`,
    sites: [
      {
        file: 'pages/project-alerts.tsx',
        line: 25,
        imports: 'Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle',
        module: 'ui/card',
        cards: 2,
        label: 'renders',
        gate: 'One of only four CardFooter usages.',
      },
    ],
  },
  {
    name: 'Target overview',
    url: T,
    sites: [
      {
        file: 'components/v2/graphql-block.tsx',
        line: 5,
        imports: 'Card',
        module: 'v2/card',
        cards: 1,
        label: 'renders',
        gate: 'Passes clsx(className) straight through. Rendered once per composite schema/service.',
      },
    ],
  },
  {
    name: 'Insights',
    url: `${T}/insights`,
    sites: [
      {
        file: 'components/target/insights/stats.tsx',
        line: 18,
        imports: 'Card, CardContent, CardHeader, CardTitle',
        module: 'ui/card',
        cards: 7,
        label: 'renders',
        gate: 'The stat-tile shape. Also rendered on the per-operation insights view.',
      },
      {
        file: 'components/target/insights/stats.tsx',
        line: 292,
        imports: 'border-neutral-5 bg-neutral-2/50 rounded-md border p-5',
        module: '-',
        cards: 0,
        label: 'div',
        gate: 'Four of these, in a file that already imports Card (lines 292, 590, 863, 963).',
      },
    ],
  },
  {
    name: 'Insights - Client',
    url: `${T}/insights/client/$name`,
    reach: 'Pick a client from the Insights page; $name is in the path.',
    sites: [
      {
        file: 'pages/target-insights-client.tsx',
        line: 9,
        imports: 'Card, CardContent, CardDescription, CardHeader, CardTitle',
        module: 'ui/card',
        cards: 7,
        label: 'renders',
        gate: '4 stat tiles + 3 grid panels with min-h/grow/overflow bodies.',
      },
    ],
  },
  {
    name: 'Insights - Schema coordinate',
    url: `${T}/insights/schema-coordinate/Query.users`,
    reach: 'Or click a coordinate from Explorer. Substitute a real coordinate.',
    sites: [
      {
        file: 'pages/target-insights-coordinate.tsx',
        line: 18,
        imports: 'Card, CardContent, CardDescription, CardHeader, CardTitle',
        module: 'ui/card',
        cards: 10,
        label: 'renders',
        gate: 'Largest single call site. Mixes text-sm and default text-lg titles on one page.',
      },
    ],
  },
  {
    name: 'Insights - Manage filters',
    url: `${T}/insights/manage-filters`,
    sites: [
      {
        file: 'pages/target-insights-manage-filters.tsx',
        line: 15,
        imports: 'Card, CardContent, CardHeader, CardTitle',
        module: 'ui/card',
        cards: 1,
        label: 'renders',
      },
    ],
  },
  {
    name: 'Target settings - General',
    url: `${T}/settings?page=general`,
    sites: [
      {
        file: 'pages/target-settings.tsx',
        line: 25,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
        gate: '15 uses - the heaviest CardDescription consumer. Spans several settings tabs.',
      },
    ],
  },
  {
    name: 'Target settings - CDN tokens',
    url: `${T}/settings?page=cdn`,
    sites: [
      {
        file: 'components/target/settings/cdn-access-tokens.tsx',
        line: 7,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
        gate: 'Tab only exists when viewerCanModifyCDNAccessToken.',
      },
    ],
  },
  {
    name: 'Target settings - Schema contracts',
    url: `${T}/settings?page=schema-contracts`,
    sites: [
      {
        file: 'components/target/settings/schema-contracts.tsx',
        line: 9,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
        gate: 'Needs viewerCanModifySettings AND project.type === Federation.',
      },
    ],
  },
  {
    name: 'Apps',
    url: `${T}/apps`,
    sites: [
      {
        file: 'pages/target-apps.tsx',
        line: 9,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
      },
    ],
  },
  {
    name: 'App version',
    url: `${T}/apps/$appName/$appVersion`,
    reach: 'Click through from Apps.',
    sites: [
      {
        file: 'pages/target-app-version.tsx',
        line: 9,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
      },
    ],
  },
  {
    name: 'Proposals',
    url: `${T}/proposals`,
    sites: [
      {
        file: 'pages/target-proposals.tsx',
        line: 8,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
      },
      {
        file: 'pages/target-proposals.tsx',
        line: 175,
        imports: 'border-neutral-5/50 bg-neutral-2/50 min-h-full gap-2.5 rounded-md border p-2.5',
        module: '-',
        cards: 0,
        label: 'div',
      },
    ],
  },
  {
    name: 'Proposal detail',
    url: `${T}/proposals/$proposalId`,
    reach: 'Click through from Proposals.',
    sites: [
      {
        file: 'pages/target-proposal.tsx',
        line: 13,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
      },
    ],
  },
  {
    name: 'New proposal',
    url: `${T}/proposals/new`,
    sites: [
      {
        file: 'pages/target-proposals-new.tsx',
        line: 23,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
      },
      {
        file: 'components/target/proposals/editor.tsx',
        line: 4,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
        gate: 'Also rendered on the edit-proposal route.',
      },
      {
        file: 'components/target/proposals/save-proposal-modal.tsx',
        line: 5,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
        gate: 'A modal - only visible while a proposal submission is in flight.',
      },
    ],
  },
  {
    name: 'Alerts - Create',
    url: `${T}/alerts/create`,
    sites: [
      {
        file: 'components/target/alerts/alert-form.tsx',
        line: 20,
        imports: 'Card, CardContent, CardDescription, CardHeader, CardTitle',
        module: 'base/card',
        cards: 4,
        label: 'renders',
        gate: 'Numbered step cards. One of only two base/card consumers.',
      },
      {
        file: 'components/target/alerts/alert-notification-preview.tsx',
        line: 136,
        imports: 'bg-neutral-2 dark:bg-neutral-3 border-neutral-5 rounded-md border',
        module: '-',
        cards: 0,
        label: 'div',
        gate: 'Four of these (136, 208, 241, 284), exactly the background pair used by ui/card.',
      },
      {
        file: 'components/target/alerts/alert-metric-chart.tsx',
        line: 154,
        imports: 'bg-neutral-2 dark:bg-neutral-3 border-neutral-5 h-[200px] rounded-md border',
        module: '-',
        cards: 0,
        label: 'div',
        gate: 'Chart placeholder box. Same shape in alert-activity-chart.tsx:122.',
      },
    ],
  },
  {
    name: 'Traces',
    url: `${T}/traces`,
    sites: [
      {
        file: 'pages/target-traces.tsx',
        line: 584,
        imports: 'bg-neutral-2/50 rounded-lg border shadow-sm',
        module: '-',
        cards: 0,
        label: 'div',
        gate: 'Near-exact copy of the base classes used by ui/card.',
      },
    ],
  },
  {
    name: 'Trace detail',
    url: `${T}/trace/$traceId`,
    reach: 'Click a trace from Traces.',
    sites: [
      {
        file: 'pages/target-trace.tsx',
        line: 29,
        imports: 'CardDescription',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
      },
    ],
  },
  {
    name: 'History',
    url: `${T}/history`,
    reach: 'Redirects to /history/$versionId unless the target has no schema version.',
    sites: [
      {
        file: 'pages/target-history.tsx',
        line: 283,
        imports: 'border-neutral-5/50 bg-neutral-2/50 min-w-[420px] grow flex-col gap-2.5',
        module: '-',
        cards: 0,
        label: 'div',
      },
      {
        file: 'pages/target-history-schema-version.tsx',
        line: 1550,
        imports: 'bg-neutral-2 dark:bg-neutral-3 grid grid-cols-3 gap-px rounded-xl',
        module: '-',
        cards: 0,
        label: 'div',
      },
    ],
  },
  {
    name: 'Insights - Operation',
    url: `${T}/insights/$operationName/$operationHash`,
    reach: 'Click an operation from Insights.',
    sites: [
      {
        file: 'pages/target-insights-operation.tsx',
        line: 133,
        imports: 'border-neutral-5 bg-neutral-2/50 mt-12 w-full rounded-md border p-5',
        module: '-',
        cards: 0,
        label: 'div',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Cross-cutting: not one screen
  // ---------------------------------------------------------------------------
  {
    name: 'Cross-cutting - the layout primitive',
    url: null,
    reach:
      'SubPageLayoutHeader, rendered on 15 pages directly and 13 more via intermediate components. Visible on every settings screen above.',
    sites: [
      {
        file: 'components/ui/page-content-layout.tsx',
        line: 3,
        imports: 'CardDescription, CardTitle',
        module: 'ui/card',
        cards: 0,
        label: 'sub-parts',
        gate: 'THE root cause. Lines 59-70 wrap a string description but pass a ReactNode through unwrapped, so any caller needing two paragraphs or a docs link imports CardDescription to match. Every "sub-parts" row above exists because of this.',
      },
    ],
  },
  {
    name: 'Cross-cutting - empty states',
    url: null,
    reach: 'EmptyList, used by 18 pages. Try Explorer or Checks on a target with no data.',
    sites: [
      {
        file: 'components/ui/empty-list.tsx',
        line: 5,
        imports: 'Card',
        module: 'ui/card',
        cards: 1,
        label: 'renders',
        gate: 'Uses Card as a generic bordered box. Merges a passed-in className.',
      },
    ],
  },
  {
    name: 'Admin stats',
    url: `${APP}/manage`,
    reach: 'Superuser only, no nav link.',
    sites: [
      {
        file: 'components/admin/AdminStats.tsx',
        line: 428,
        imports: 'border-neutral-5 bg-neutral-2/50 flex justify-between rounded-md border p-5',
        module: '-',
        cards: 0,
        label: 'div',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Not reachable by normal navigation
  // ---------------------------------------------------------------------------
  {
    name: 'Auth screens',
    url: `${APP}/auth/sign-in`,
    reach:
      'Sign out first. /auth/sign-up and /auth/sso also work; /auth/callback/$provider, /auth/verify-email and /auth/reset-password are OAuth or email-link only.',
    sites: [
      {
        file: 'components/auth.tsx',
        line: 1,
        imports: 'Card, CardContent, CardDescription, CardHeader, CardTitle',
        module: 'ui/card',
        cards: 1,
        label: 'renders',
        gate: 'The shell of all 7 auth routes. Carries data-cy hooks asserted by e2e/specs/app.spec.ts:161. Its AuthCard accepts a className prop and silently ignores it.',
      },
    ],
  },
  {
    name: 'New organization',
    url: `${APP}/org/new`,
    reach: 'Also the automatic destination when a user has zero orgs.',
    sites: [
      {
        file: 'pages/organization-new.tsx',
        line: 14,
        imports: 'Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle',
        module: 'ui/card',
        cards: 1,
        label: 'renders',
      },
    ],
  },
  {
    name: 'Join organization',
    url: null,
    reach: '/join/$inviteCode - emailed invite link only.',
    sites: [
      {
        file: 'pages/organization-join.tsx',
        line: 6,
        imports: 'Card, CardContent, CardFooter, CardHeader, CardTitle',
        module: 'ui/card',
        cards: 2,
        label: 'renders',
        gate: 'Has the only responsive CardFooter (stacks below md).',
      },
    ],
  },
  {
    name: 'OIDC login required',
    url: null,
    reach:
      '/{org}/oidc-request?id=... - forced by a window.location.href redirect from the urql error exchange. ?id= is required.',
    sites: [
      {
        file: 'pages/organization-oidc-request.tsx',
        line: 4,
        imports: 'Card',
        module: 'ui/card',
        cards: 1,
        label: 'renders',
      },
    ],
  },
  {
    name: 'Support ticket not found',
    url: null,
    reach:
      'The fallback branch of organization-support-ticket.tsx when the ticket is missing or inaccessible.',
    sites: [
      {
        file: 'components/ui/not-found.tsx',
        line: 2,
        imports: 'Card (via the @/components/v2/index barrel)',
        module: 'v2/card',
        cards: 1,
        label: 'renders',
        gate: 'Easy to miss in a grep - imports from the barrel, not v2/card directly. Carries data-cy="empty-list", which looks copy-pasted.',
      },
    ],
  },
];

const LABEL_STYLE: Record<Label, string> = {
  renders: 'bg-emerald-500/15 text-emerald-500',
  'sub-parts': 'bg-amber-500/15 text-amber-500',
  div: 'bg-neutral-6/40 text-neutral-11',
};

const LABEL_TEXT: Record<Label, string> = {
  renders: 'renders a Card',
  'sub-parts': 'sub-parts only',
  div: 'card-shaped div',
};

function Badge(props: { label: Label }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${LABEL_STYLE[props.label]}`}
    >
      {LABEL_TEXT[props.label]}
    </span>
  );
}

function Stat(props: { value: ReactNode; label: string }) {
  return (
    <div className="border-neutral-5 rounded-md border px-4 py-3">
      <div className="text-neutral-12 text-2xl font-semibold">{props.value}</div>
      <div className="text-neutral-10 text-xs">{props.label}</div>
    </div>
  );
}

function ScreenBlock(props: { screen: Screen }) {
  const { screen } = props;

  return (
    <section className="border-neutral-5 border-t py-6 first:border-t-0">
      <div className="mb-3">
        <h3 className="text-neutral-12 text-sm font-medium">{screen.name}</h3>
        {screen.url ? (
          <a
            href={screen.url}
            target="_blank"
            rel="noreferrer"
            className="text-accent break-all text-[13px] underline"
          >
            {screen.url}
          </a>
        ) : (
          <span className="text-neutral-10 text-[13px]">not directly reachable</span>
        )}
        {screen.reach ? <p className="text-neutral-10 mt-1 text-xs">{screen.reach}</p> : null}
      </div>

      <div className="flex flex-col gap-3">
        {screen.sites.map(site => (
          <div
            key={`${site.file}:${site.line}`}
            className="border-neutral-5/60 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-md border p-3"
          >
            <code className="text-neutral-11 break-all text-[13px]">
              {site.file}:{site.line}
            </code>
            <div className="flex items-start gap-2">
              <Badge label={site.label} />
              {site.cards > 0 ? (
                <span className="text-neutral-10 shrink-0 text-[11px]">
                  {site.cards} {site.cards === 1 ? 'card' : 'cards'}
                </span>
              ) : null}
            </div>
            <div className="col-span-2">
              <code className="text-neutral-10 break-all text-[11px]">
                {site.module === '-' ? site.imports : `{ ${site.imports} } from ${site.module}`}
              </code>
              {site.gate ? (
                <p className="text-neutral-10 mt-1 text-xs italic">{site.gate}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export const ByScreen = createPreview({
  label: 'By screen',
  render: () => {
    const sites = SCREENS.flatMap(s => s.sites);
    const files = new Set(sites.filter(s => s.module !== '-').map(s => s.file));
    const count = (l: Label) => sites.filter(s => s.label === l).length;

    return (
      <div className="w-full max-w-[60rem]">
        <div className="mb-6">
          <p className="text-neutral-10 mb-4 text-xs">
            Every import of every Card module, grouped by the screen that renders it. Links open the
            live app. Labels come from greps, not judgement - the verdict is yours.
          </p>
          <div className="grid grid-cols-4 gap-3">
            <Stat value={files.size} label="files importing a Card module" />
            <Stat value={count('renders')} label="render a Card" />
            <Stat value={count('sub-parts')} label="sub-parts only (suspected misuse)" />
            <Stat value={count('div')} label="hand-rolled card-shaped divs" />
          </div>
        </div>

        {SCREENS.map(screen => (
          <ScreenBlock key={screen.name} screen={screen} />
        ))}
      </div>
    );
  },
});
