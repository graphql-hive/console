import { parseDateRangeInput } from '../../../../shared/helpers';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { OperationsManager } from '../../providers/operations-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const clientStatsByTargets: NonNullable<QueryResolvers['clientStatsByTargets']> = async (
  _,
  { selector },
  { injector },
) => {
  const translator = injector.get(IdTranslator);
  const [organization, project] = await Promise.all([
    translator.translateOrganizationId(selector),
    translator.translateProjectId(selector),
  ]);

  const targets = selector.targetIds;
  const period = parseDateRangeInput(selector.period);

  const [rows, total] = await Promise.all([
    injector.get(OperationsManager).readUniqueClientNames({
      targetId: targets,
      projectId: project,
      organizationId: organization,
      period,
    }),
    injector.get(OperationsManager).countRequests({
      organizationId: organization,
      projectId: project,
      targetId: targets,
      period,
    }),
  ]);

  const nodes = rows.map(row => {
    return {
      name: row.name,
      count: row.count,
      percentage: total === 0 ? 0 : (row.count / total) * 100,
      versions: [], // TODO: include versions at some point
    };
  });

  return {
    edges: nodes.map(node => ({ node, cursor: '' })),
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      endCursor: '',
      startCursor: '',
    },
  };
};
