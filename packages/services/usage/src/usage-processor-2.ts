import { createHash, randomUUID } from 'node:crypto';
import { ServiceLogger as Logger } from '@hive/service-common';
import { RawOperation, RawReport, RawSubscriptionOperation } from '@hive/usage-common';
import * as tb from '@sinclair/typebox';
import * as tc from '@sinclair/typebox/compiler';
import { invalidRawOperations, rawOperationsSize, totalOperations, totalReports } from './metrics';
import { TokensResponse } from './tokens';

export function usageProcessorV2(
  logger: Logger,
  incomingReport: unknown,
  token: TokensResponse,
  targetRetentionInDays: number | null,
):
  | { success: false; errors: Array<tc.ValueError> }
  | {
      success: true;
      report: RawReport;
      operations: {
        rejected: number;
        accepted: number;
      };
    } {
  const reportResult = decodeReport(incomingReport);

  if (reportResult.success === false) {
    return {
      success: false,
      errors: reportResult.errors,
    };
  }

  const incoming = reportResult.report;

  const incomingOperations = incoming.operations ?? [];
  const incomingSubscriptionOperations = incoming.subscriptionOperations ?? [];

  const size = incomingOperations.length + incomingSubscriptionOperations.length;
  totalReports.inc();
  totalOperations.inc(size);
  rawOperationsSize.observe(size);

  const rawOperations: RawOperation[] = [];
  const rawSubscriptionOperations: RawSubscriptionOperation[] = [];

  const report: RawReport = {
    id: randomUUID(),
    target: token.target,
    organization: token.organization,
    size: 0,
    map: {},
    operations: rawOperations,
    subscriptionOperations: rawSubscriptionOperations,
  };

  const newKeyMappings = new Map<OperationMapRecord, string>();

  function getOperationMapRecord(operationMapKey: string): string | null {
    const operationMapRecord = incoming.map[operationMapKey] as OperationMapRecord | undefined;

    if (!operationMapRecord) {
      return null;
    }

    let newOperationMapKey = newKeyMappings.get(operationMapRecord);

    if (newOperationMapKey === undefined) {
      const sortedFields = operationMapRecord.fields.sort();
      newOperationMapKey = createHash('md5')
        .update(token.target)
        .update(operationMapRecord.operation)
        .update(operationMapRecord.operationName ?? '')
        .update(JSON.stringify(sortedFields))
        .digest('hex');

      report.map[newOperationMapKey] = {
        key: newOperationMapKey,
        operation: operationMapRecord.operation,
        operationName: operationMapRecord.operationName,
        fields: sortedFields,
      };

      newKeyMappings.set(operationMapRecord, newOperationMapKey);
    }

    return newOperationMapKey;
  }

  for (const operation of incomingOperations) {
    const operationMapKey = getOperationMapRecord(operation.operationMapKey);

    // if the record does not exist -> skip the operation
    if (operationMapKey === null) {
      logger.warn(
        `Detected invalid operation. Operation map key could not be found. (target=%s): %s`,
        token.target,
        operation.operationMapKey,
      );
      invalidRawOperations
        .labels({
          reason: 'operation_map_key_not_found',
        })
        .inc(1);
      continue;
    }

    report.size += 1;
    rawOperations.push({
      operationMapKey,
      timestamp: operation.timestamp,
      expiresAt: targetRetentionInDays
        ? operation.timestamp + targetRetentionInDays * DAY_IN_MS
        : undefined,
      execution: {
        ok: operation.execution.ok,
        duration: operation.execution.duration,
        errorsTotal: operation.execution.errorsTotal,
      },
      metadata: {
        client: {
          name: operation.metadata?.client?.name,
          version: operation.metadata?.client?.version,
        },
      },
    });
  }

  for (const operation of incomingSubscriptionOperations) {
    const operationMapKey = getOperationMapRecord(operation.operationMapKey);

    // if the record does not exist -> skip the operation
    if (operationMapKey === null) {
      logger.warn(
        `Detected invalid operation. Operation map key could not be found. (target=%s): %s`,
        token.target,
        operation.operationMapKey,
      );
      invalidRawOperations
        .labels({
          reason: 'operation_map_key_not_found',
        })
        .inc(1);
      continue;
    }

    report.size += 1;
    rawSubscriptionOperations.push({
      operationMapKey,
      timestamp: operation.timestamp,
      expiresAt: targetRetentionInDays
        ? operation.timestamp + targetRetentionInDays * DAY_IN_MS
        : undefined,
      metadata: {
        client: {
          name: operation.metadata?.client?.name,
          version: operation.metadata?.client?.version,
        },
      },
    });
  }

  return {
    success: true,
    report,
    operations: {
      rejected: size - report.size,
      accepted: report.size,
    },
  };
}

const OperationMapRecordSchema = tb.Object(
  {
    operation: tb.String(),
    operationName: tb.Optional(tb.String()),
    fields: tb.Array(tb.String(), {
      minItems: 1,
    }),
  },
  { title: 'OperationMapRecord', additionalProperties: false },
);

type OperationMapRecord = tb.Static<typeof OperationMapRecordSchema>;

const ExecutionSchema = tb.Type.Object(
  {
    ok: tb.Type.Boolean(),
    duration: tb.Type.Integer(),
    errorsTotal: tb.Type.Integer(),
  },
  {
    title: 'Execution',
    additionalProperties: false,
  },
);

const ClientSchema = tb.Type.Object(
  {
    name: tb.Type.String(),
    version: tb.Type.String(),
  },
  {
    title: 'Client',
    additionalProperties: false,
  },
);

const MetadataSchema = tb.Type.Object(
  {
    client: tb.Type.Optional(ClientSchema),
  },
  {
    title: 'Metadata',
    additionalProperties: false,
  },
);

/** Query + Mutation */
const RequestOperationSchema = tb.Type.Object(
  {
    timestamp: tb.Type.Integer(),
    operationMapKey: tb.Type.String(),
    execution: ExecutionSchema,
    metadata: tb.Type.Optional(MetadataSchema),
  },
  {
    title: 'RequestOperation',
    additionalProperties: false,
  },
);

/** Subscription / Live Query */
const SubscriptionOperationSchema = tb.Type.Object(
  {
    timestamp: tb.Type.Integer(),
    operationMapKey: tb.Type.String(),
    metadata: tb.Type.Optional(MetadataSchema),
  },
  {
    title: 'SubscriptionOperation',
    additionalProperties: false,
  },
);

export const ReportSchema = tb.Type.Object(
  {
    size: tb.Type.Integer(),
    map: tb.Record(tb.String(), OperationMapRecordSchema),
    operations: tb.Optional(tb.Array(RequestOperationSchema)),
    subscriptionOperations: tb.Optional(tb.Array(SubscriptionOperationSchema)),
  },
  {
    title: 'Report',
    additionalProperties: false,
  },
);

type ReportType = tb.Static<typeof ReportSchema>;

const ReportModel = tc.TypeCompiler.Compile(ReportSchema);

function decodeReport(
  report: unknown,
): { success: true; report: ReportType } | { success: false; errors: tc.ValueError[] } {
  const errors = ReportModel.Errors(report);
  if (errors.First()) {
    const truncatedErrors = getFirstN(errors, 5);

    return {
      success: false,
      errors: truncatedErrors,
    };
  }

  return {
    success: true,
    report: report as ReportType,
  };
}

function getFirstN<TValue>(iterable: Iterable<TValue>, max: number): TValue[] {
  let counter = 0;
  const items: Array<TValue> = [];
  for (const item of iterable) {
    items.push(item);
    counter++;

    if (counter >= max) {
      break;
    }
  }

  return items;
}

const DAY_IN_MS = 86_400_000;
