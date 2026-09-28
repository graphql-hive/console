import { z } from 'zod';
import { SchemaProposalStage } from '@/gql/graphql';
import { ProposalTab, TargetProposalsSinglePage } from '@/pages/target-proposal';
import { TargetProposalsPage } from '@/pages/target-proposals';
import { ProposalsNewProposalQuery, TargetProposalsNewPage } from '@/pages/target-proposals-new';
import { loadQuery, requireLayoutFlag } from '@/lib/route-utils';
import { createRoute, useParams } from '@tanstack/react-router';
import { targetRoute } from './route';

export const targetProposalsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'proposals',
  validateSearch: z.object({
    stage: z
      .enum(Object.values(SchemaProposalStage).map(s => s.toLowerCase()) as [string, ...string[]])
      .array()
      .optional()
      .catch(() => void 0),
    user: z.string().array().optional().catch(undefined),
  }),
  loader: loader => requireLayoutFlag.target(loader, 'viewerCanViewSchemaProposals'),
  component: function TargetProposalsRoute() {
    // select proposalId from child route
    const proposalId = useParams({
      strict: false,
      select: p => p.proposalId,
    });
    const { stage, user } = targetProposalsRoute.useSearch();
    return (
      <TargetProposalsPage
        filterStages={stage}
        filterUserIds={user}
        selectedProposalId={proposalId}
      />
    );
  },
});

export const targetProposalsNewRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'proposals/new',
  // Started beside the gate, not after it: on a cold load the gate waits for the layout request.
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug } = loader.params;
    void loadQuery(loader, ProposalsNewProposalQuery, {
      targetReference: { bySelector: { organizationSlug, projectSlug, targetSlug } },
    });
    return requireLayoutFlag.target(loader, 'viewerCanViewSchemaProposals');
  },
  component: TargetProposalsNewPage,
});

export const targetProposalsSingleRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'proposals/$proposalId',
  validateSearch: z.object({
    ts: z.number().optional(),
    page: z
      .enum(Object.values(ProposalTab).map(s => s.toLowerCase()) as [string, ...string[]])
      .optional()
      .catch(() => void 0),
    version: z.string().optional(),
  }),
  loader: loader => requireLayoutFlag.target(loader, 'viewerCanViewSchemaProposals'),
  component: function TargetProposalRoute() {
    const { proposalId } = targetProposalsSingleRoute.useParams();
    const { page, version, ts } = targetProposalsSingleRoute.useSearch();
    return (
      <TargetProposalsSinglePage
        proposalId={proposalId}
        tab={page ?? (ProposalTab.DETAILS as string)}
        version={version}
        timestamp={ts}
      />
    );
  },
});
