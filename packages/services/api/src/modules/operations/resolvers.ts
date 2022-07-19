import { hash, nsToMs, parseDateRangeInput } from '../../shared/helpers';
import { createConnection } from '../../shared/schema';
import { IdTranslator } from '../shared/providers/id-translator';
import { OperationsManager } from './providers/operations-manager';
import { OperationsModule } from './__generated__/types';

export const resolvers: OperationsModule.Resolvers = {
  Query: {
    async hasCollectedOperations(_, { selector }, { injector }) {
      const translator = injector.get(IdTranslator);
      const [organization, project, target] = await Promise.all([
        translator.translateOrganizationId(selector),
        translator.translateProjectId(selector),
        translator.translateTargetId(selector),
      ]);

      return injector.get(OperationsManager).hasCollectedOperations({
        organization,
        project,
        target,
      });
    },
    async fieldStats(_, { selector }, { injector }) {
      const translator = injector.get(IdTranslator);
      const [organization, project, target] = await Promise.all([
        translator.translateOrganizationId(selector),
        translator.translateProjectId(selector),
        translator.translateTargetId(selector),
      ]);

      return injector.get(OperationsManager).readFieldStats({
        organization,
        project,
        target,
        type: selector.type,
        field: selector.field,
        argument: selector.argument ?? undefined,
        period: parseDateRangeInput(selector.period),
      });
    },
    async fieldListStats(_, { selector }, { injector }) {
      const translator = injector.get(IdTranslator);
      const [organization, project, target] = await Promise.all([
        translator.translateOrganizationId(selector),
        translator.translateProjectId(selector),
        translator.translateTargetId(selector),
      ]);

      return injector.get(OperationsManager).readFieldListStats({
        organization,
        project,
        target,
        fields: selector.fields,
        period: parseDateRangeInput(selector.period),
      });
    },
    async operationsStats(_, { selector }, { injector }) {
      const translator = injector.get(IdTranslator);
      const [organization, project, target] = await Promise.all([
        translator.translateOrganizationId(selector),
        translator.translateProjectId(selector),
        translator.translateTargetId(selector),
      ]);

      const operations = selector.operations ?? [];

      return {
        period: parseDateRangeInput(selector.period),
        organization,
        project,
        target,
        operations,
      };
    },
    async clientStatsByTargets(_, { selector }, { injector }) {
      const translator = injector.get(IdTranslator);
      const [organization, project] = await Promise.all([
        translator.translateOrganizationId(selector),
        translator.translateProjectId(selector),
      ]);

      const targets = selector.targetIds;
      const period = parseDateRangeInput(selector.period);

      const [rows, total] = await Promise.all([
        injector.get(OperationsManager).readUniqueClientNames({
          target: targets,
          project,
          organization,
          period,
        }),
        injector.get(OperationsManager).countRequests({
          organization,
          project,
          target: targets,
          period,
        }),
      ]);

      return rows.map(row => {
        return {
          name: row.name,
          count: row.count,
          percentage: total === 0 ? 0 : (row.count / total) * 100,
          versions: [], // TODO: include versions at some point
        };
      });
    },
  },
  OperationsStats: {
    async operations({ organization, project, target, period, operations: operationsFilter }, _, { injector }) {
      const operationsManager = injector.get(OperationsManager);
      const [operations, durations] = await Promise.all([
        operationsManager.readOperationsStats({
          organization,
          project,
          target,
          period,
          operations: operationsFilter,
        }),
        operationsManager.readDetailedDurationPercentiles({
          organization,
          project,
          target,
          period,
          operations: operationsFilter,
        }),
      ]);

      return operations
        .map(op => {
          return {
            id: hash(`${op.operationName}__${op.document}`),
            kind: op.kind,
            document: op.document,
            name: op.operationName,
            count: op.count,
            countOk: op.countOk,
            percentage: op.percentage,
            duration: durations.get(op.operationHash!)!,
            operationHash: op.operationHash,
          };
        })
        .sort((a, b) => b.count - a.count);
    },
    totalRequests({ organization, project, target, period, operations }, _, { injector }) {
      return injector.get(OperationsManager).countRequests({
        organization,
        project,
        target,
        period,
        operations,
      });
    },
    totalFailures({ organization, project, target, period, operations: operationsFilter }, _, { injector }) {
      return injector.get(OperationsManager).countFailures({
        organization,
        project,
        target,
        period,
        operations: operationsFilter,
      });
    },
    totalOperations({ organization, project, target, period, operations: operationsFilter }, _, { injector }) {
      return injector.get(OperationsManager).countUniqueOperations({
        organization,
        project,
        target,
        period,
        operations: operationsFilter,
      });
    },
    requestsOverTime(
      { organization, project, target, period, operations: operationsFilter },
      { resolution },
      { injector }
    ) {
      return injector.get(OperationsManager).readRequestsOverTime({
        target,
        project,
        organization,
        period,
        resolution,
        operations: operationsFilter,
      });
    },
    failuresOverTime(
      { organization, project, target, period, operations: operationsFilter },
      { resolution },
      { injector }
    ) {
      return injector.get(OperationsManager).readFailuresOverTime({
        target,
        project,
        organization,
        period,
        resolution,
        operations: operationsFilter,
      });
    },
    durationOverTime(
      { organization, project, target, period, operations: operationsFilter },
      { resolution },
      { injector }
    ) {
      return injector.get(OperationsManager).readDurationOverTime({
        target,
        project,
        organization,
        period,
        resolution,
        operations: operationsFilter,
      });
    },
    clients({ organization, project, target, period, operations: operationsFilter }, _, { injector }) {
      return injector.get(OperationsManager).readUniqueClients({
        target,
        project,
        organization,
        period,
        operations: operationsFilter,
      });
    },
    duration({ organization, project, target, period, operations: operationsFilter }, _, { injector }) {
      return injector.get(OperationsManager).readGeneralDurationPercentiles({
        organization,
        project,
        target,
        period,
        operations: operationsFilter,
      });
    },
    async durationHistogram({ organization, project, target, period, operations: operationsFilter }, _, { injector }) {
      const histogram = await injector.get(OperationsManager).readDurationHistogram({
        organization,
        project,
        target,
        period,
        operations: operationsFilter,
      });

      const uniqueDurations = new Map<
        number,
        {
          duration: number;
          count: number;
        }
      >();

      for (let i = 0; i < histogram.length; i++) {
        const node = histogram[i];
        const slot = Math.floor(nsToMs(node.duration) / 50);

        if (uniqueDurations.has(slot)) {
          uniqueDurations.get(slot)!.count += node.count;
        } else {
          uniqueDurations.set(slot, {
            duration: (slot + 1) * 50,
            count: node.count,
          });
        }
      }

      return Array.from(uniqueDurations.values());
    },
  },
  DurationStats: {
    p75(value) {
      return transformPercentile(value['75.0']);
    },
    p90(value) {
      return transformPercentile(value['90.0']);
    },
    p95(value) {
      return transformPercentile(value['95.0']);
    },
    p99(value) {
      return transformPercentile(value['99.0']);
    },
  },
  OperationStatsConnection: createConnection(),
  ClientStatsConnection: createConnection(),
  OrganizationGetStarted: {
    reportingOperations(organization, _, { injector }) {
      if (organization.reportingOperations === true) {
        return organization.reportingOperations;
      }

      return injector.get(OperationsManager).hasOperationsForOrganization({
        organization: organization.id,
      });
    },
  },
};

function transformPercentile(value: number | null): number {
  return value ? Math.round(nsToMs(value)) : 0;
}
