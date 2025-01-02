import { parseDateRangeInput } from '../../../shared/helpers';
import { OperationsManager } from '../providers/operations-manager';
import type { ProjectResolvers } from './../../../__generated__/types';

export const Project: Pick<ProjectResolvers, 'requestsOverTime' | 'totalRequests' | '__isTypeOf'> =
  {
    totalRequests: (project, { period }, { injector }) => {
      return injector.get(OperationsManager).countRequestsOfProject({
        projectId: project.id,
        organizationId: project.orgId,
        period: parseDateRangeInput(period),
      });
    },
    requestsOverTime: (project, { resolution, period }, { injector }) => {
      return injector.get(OperationsManager).readRequestsOverTimeOfProject({
        projectId: project.id,
        organizationId: project.orgId,
        period: parseDateRangeInput(period),
        resolution,
      });
    },
  };
