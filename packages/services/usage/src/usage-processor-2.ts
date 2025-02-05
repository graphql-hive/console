import { createHash, randomUUID } from 'node:crypto';
import { ServiceLogger as Logger, traceInlineSync } from '@hive/service-common';
import {
  type ClientMetadata,
  type RawOperation,
  type RawReport,
  type RawSubscriptionOperation,
} from '@hive/usage-common';
import * as tb from '@sinclair/typebox';
import * as tc from '@sinclair/typebox/compiler';
import { invalidRawOperations, rawOperationsSize, totalOperations, totalReports } from './metrics';
import { TokensResponse } from './tokens';
import { isValidOperationBody } from './usage-processor-1';

export const usageProcessorV2 = traceInlineSync(
  'usageProcessorV2',
  {
    initAttributes: (_logger, _incomingReport, token) => ({
      'hive.input.target': token.target,
      'hive.input.project': token.project,
      'hive.input.organization': token.organization,
    }),
    resultAttributes: result => ({
      'hive.result.success': result.success,
      'hive.result.reportId': result.success ? result.report.id : undefined,
      'hive.result.operations.accepted': result.success ? result.operations.accepted : undefined,
      'hive.result.operations.rejected': result.success ? result.operations.rejected : undefined,
      'hive.result.error.count': result.success ? undefined : result.errors.length,
    }),
  },
  (
    logger: Logger,
    incomingReport: unknown,
    token: TokensResponse,
    targetRetentionInDays: number | null,
  ):
    | { success: false; errors: Array<ValueError> }
    | {
        success: true;
        report: RawReport;
        operations: {
          rejected: number;
          accepted: number;
        };
      } => {
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

    const lastAppDeploymentUsage = new Map<`${string}/${string}`, number>();

    function upsertClientUsageTimestamp(
      clientName: string,
      clientVersion: string,
      timestamp: number,
    ) {
      const key = `${clientName}/${clientVersion}` as const;
      let latestTimestamp = lastAppDeploymentUsage.get(key);
      if (!latestTimestamp || timestamp > latestTimestamp) {
        lastAppDeploymentUsage.set(key, timestamp);
      }
    }

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

    function getOperationMapRecordKey(operationMapKey: string): string | null {
      const operationMapRecord = incoming.map[operationMapKey] as OperationMapRecord | undefined;

      if (!operationMapRecord) {
        logger.warn(
          `Detected invalid operation. Operation map key could not be found. (target=%s): %s`,
          token.target,
          operationMapKey,
        );
        invalidRawOperations
          .labels({
            reason: 'operation_map_key_not_found',
          })
          .inc(1);
        return null;
      }

      let newOperationMapKey = newKeyMappings.get(operationMapRecord);

      if (!isValidOperationBody(operationMapRecord.operation)) {
        logger.warn(`Detected invalid operation (target=%s): %s`, token.target, operationMapKey);
        invalidRawOperations
          .labels({
            reason: 'invalid_operation_body',
          })
          .inc(1);
        return null;
      }

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
      const operationMapKey = getOperationMapRecordKey(operation.operationMapKey);

      // if the record does not exist -> skip the operation
      if (operationMapKey === null) {
        continue;
      }

      let client: ClientMetadata | undefined;
      if (operation.persistedDocumentHash) {
        const [name, version] = operation.persistedDocumentHash.split('~');
        client = {
          name,
          version,
        };
        upsertClientUsageTimestamp(name, version, operation.timestamp);
      } else {
        client = operation.metadata?.client ?? undefined;
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
          client,
        },
      });
    }

    for (const operation of incomingSubscriptionOperations) {
      const operationMapKey = getOperationMapRecordKey(operation.operationMapKey);

      // if the record does not exist -> skip the operation
      if (operationMapKey === null) {
        continue;
      }

      let client: ClientMetadata | undefined;
      if (operation.persistedDocumentHash) {
        const [name, version] = operation.persistedDocumentHash.split('/');
        client = {
          name,
          version,
        };
        upsertClientUsageTimestamp(name, version, operation.timestamp);
      } else {
        client = operation.metadata?.client ?? undefined;
      }

      report.size += 1;
      rawSubscriptionOperations.push({
        operationMapKey,
        timestamp: operation.timestamp,
        expiresAt: targetRetentionInDays
          ? operation.timestamp + targetRetentionInDays * DAY_IN_MS
          : undefined,
        metadata: {
          client,
        },
      });
    }

    if (lastAppDeploymentUsage.size) {
      report.appDeploymentUsageTimestamps = Object.fromEntries(lastAppDeploymentUsage);
    }

    return {
      success: true,
      report,
      operations: {
        rejected: size - report.size,
        accepted: report.size,
      },
    };
  },
);

// The idea behind this function is to make sure we use Optional on top of the Union.
// If the order is different, the field will be required.
//
// Instead of creating `Nullable` helper type, that could be used in property definitions,
// I decided to create `OptionalAndNullable` to prevent people making the mistake I mentioned.
const OptionalAndNullable = <T extends tb.TSchema>(schema: T) =>
  // Makes the field optional
  tb.Optional(
    // Either `null` or `T` is accepted
    tb.Type.Union([schema, tb.Type.Null()]),
  );

const OperationMapRecordSchema = tb.Object(
  {
    operation: tb.String(),
    operationName: OptionalAndNullable(tb.String()),
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
    duration: tb.Type.Integer({
      // https://clickhouse.com/docs/en/sql-reference/data-types/int-uint
      minimum: 0,
      // Maximum value is 18_446_744_073_709_551_615, but we stick to Math.pow(2, 63).
      // Using 2^64 in JS is problematic and 2^63 is more than enough.
      maximum: Math.pow(2, 63),
    }),
    errorsTotal: tb.Type.Integer({
      // https://clickhouse.com/docs/en/sql-reference/data-types/int-uint
      minimum: 0,
      maximum: Math.pow(2, 16) - 1,
    }),
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
    client: OptionalAndNullable(ClientSchema),
  },
  {
    title: 'Metadata',
    additionalProperties: false,
  },
);

const PersistedDocumentHash = tb.Type.String({
  title: 'PersistedDocumentHash',
  // appName/appVersion/hash
  pattern: '^[a-zA-Z0-9_-]{1,64}~[a-zA-Z0-9._-]{1,64}~([A-Za-z]|[0-9]|_){1,128}$',
});

const unixTimestampRegex = /^\d{13,}$/;
function isUnixTimestamp(x: number) {
  return unixTimestampRegex.test(String(x));
}

tb.TypeRegistry.Set<number>('UnixTimestampInMs', (_, value) =>
  typeof value === 'number' ? isUnixTimestamp(value) : false,
);

const UnixTimestampInMs = tb.Type.Unsafe<number>({ [tb.Kind]: 'UnixTimestampInMs' });

/** Query + Mutation */
const RequestOperationSchema = tb.Type.Object(
  {
    timestamp: UnixTimestampInMs,
    operationMapKey: tb.Type.String(),
    execution: ExecutionSchema,
    metadata: OptionalAndNullable(MetadataSchema),
    persistedDocumentHash: OptionalAndNullable(PersistedDocumentHash),
  },
  {
    title: 'RequestOperation',
    additionalProperties: false,
  },
);

/** Subscription / Live Query */
const SubscriptionOperationSchema = tb.Type.Object(
  {
    timestamp: UnixTimestampInMs,
    operationMapKey: tb.Type.String(),
    metadata: OptionalAndNullable(MetadataSchema),
    persistedDocumentHash: OptionalAndNullable(PersistedDocumentHash),
  },
  {
    title: 'SubscriptionOperation',
    additionalProperties: false,
  },
);

export const ReportSchema = tb.Type.Object(
  {
    size: tb.Type.Integer({
      minimum: 1,
    }),
    map: tb.Record(tb.String(), OperationMapRecordSchema),
    operations: OptionalAndNullable(tb.Array(RequestOperationSchema)),
    subscriptionOperations: OptionalAndNullable(tb.Array(SubscriptionOperationSchema)),
  },
  {
    title: 'Report',
    additionalProperties: false,
  },
);

type ReportType = tb.Static<typeof ReportSchema>;

const ReportModel = tc.TypeCompiler.Compile(ReportSchema);

interface ValueError {
  path: string;
  message: string;
  errors?: ValueError[];
}

export function decodeReport(
  report: unknown,
): { success: true; report: ReportType } | { success: false; errors: Array<ValueError> } {
  const errors = ReportModel.Errors(report);
  if (ReportModel.Errors(report).First()) {
    return {
      success: false,
      errors: getTypeBoxErrors(errors),
    };
  }

  return {
    success: true,
    report: report as ReportType,
  };
}

function getTypeBoxErrors(errors: tc.ValueErrorIterator): Array<ValueError> {
  return Array.from(errors).map(error => {
    const errors = error.errors.flatMap(errors => getTypeBoxErrors(errors));
    return {
      path: error.path,
      message: error.message,
      errors: errors.length ? errors : undefined,
    };
  });
}

const DAY_IN_MS = 86_400_000;
