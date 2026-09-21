import { z } from 'zod';
import { SchemaProposalStage } from '@/gql/graphql';
import { ProposalTab, TargetProposalsSinglePage } from '@/pages/target-proposal';
import { TargetProposalsPage } from '@/pages/target-proposals';
import { TargetProposalsNewPage } from '@/pages/target-proposals-new';
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
  component: function TargetProposalsRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetProposalsRoute.useParams();
    // select proposalId from child route
    const proposalId = useParams({
      strict: false,
      select: p => p.proposalId,
    });
    const { stage, user } = targetProposalsRoute.useSearch();
    return (
      <TargetProposalsPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
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
  component: function TargetProposalRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetProposalsNewRoute.useParams();
    return (
      <TargetProposalsNewPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
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
  component: function TargetProposalRoute() {
    const { organizationSlug, projectSlug, targetSlug, proposalId } =
      targetProposalsSingleRoute.useParams();
    const { page, version, ts } = targetProposalsSingleRoute.useSearch();
    return (
      <TargetProposalsSinglePage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        proposalId={proposalId}
        tab={page ?? (ProposalTab.DETAILS as string)}
        version={version}
        timestamp={ts}
      />
    );
  },
});
