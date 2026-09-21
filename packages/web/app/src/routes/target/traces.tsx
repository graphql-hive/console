import { useMemo } from 'react';
import { z } from 'zod';
import { Page, TargetLayout } from '@/components/layouts/target';
import { Meta } from '@/components/ui/meta';
import { TargetTracePage } from '@/pages/target-trace';
import {
  FilterState,
  TargetTracesFilterState,
  TargetTracesPageContent,
  TargetTracesSort,
} from '@/pages/target-traces';
import { createRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { targetRoute } from './route';

const TargetTracesRouteSearch = z.object({
  filter: TargetTracesFilterState.optional(),
  sort: TargetTracesSort.shape.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const targetTracesRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'traces',
  validateSearch: zodValidator(TargetTracesRouteSearch),
  component: function TargetTracesRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetTracesRoute.useParams();
    const {
      filter = {
        'graphql.client': [],
        'graphql.errorCode': [],
        'graphql.kind': [],
        'graphql.operation': [],
        'graphql.status': [],
        'graphql.subgraph': [],
        'http.host': [],
        'http.method': [],
        'http.route': [],
        'http.status': [],
        'http.url': [],
        'trace.id': [],
        duration: [],
      } satisfies FilterState,
      sort = {
        id: 'timestamp',
        desc: true,
      },
      from,
      to,
    } = targetTracesRoute.useSearch();

    const range = useMemo(() => (from && to ? { from, to } : null), [from, to]);

    return (
      <>
        <Meta title="Traces" />
        <TargetLayout
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
          page={Page.Traces}
        >
          <TargetTracesPageContent sorting={sort} filter={filter} range={range} />
        </TargetLayout>
      </>
    );
  },
});

const TargetTraceRouteSearchModel = z.object({
  activeSpanId: z.string().optional(),
  activeSpanTab: z.string().optional(),
});

export const targetTraceRoute = createRoute({
  getParentRoute: () => targetRoute,
  validateSearch(search) {
    return TargetTraceRouteSearchModel.parse(search);
  },
  path: 'trace/$traceId',
  component: function TargetTraceRoute() {
    const { organizationSlug, projectSlug, targetSlug, traceId } = targetTraceRoute.useParams();
    const { activeSpanId, activeSpanTab } = targetTraceRoute.useSearch();
    return (
      <TargetTracePage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        traceId={traceId}
        activeSpanId={activeSpanId ?? null}
        activeSpanTab={activeSpanTab ?? null}
      />
    );
  },
});
