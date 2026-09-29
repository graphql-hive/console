import {
  parseUUID,
  reserve,
  type Sink,
  type Writer,
  writeBool,
  writeRows,
  writeString,
  writeUInt16,
  writeUInt32,
  writeUInt64,
  writeUVarint,
  writeUUID,
} from '@clickhouse/rowbinary/writer';
import type {
  ProcessedAppDeploymentUsageRecord,
  ProcessedOperationErrorRecord,
  ProcessedOperation,
  ProcessedRegistryRecord,
  ProcessedSubscriptionOperation,
} from '@hive/usage-common';

export const operationsOrder = [
  'organization',
  'target',
  'timestamp',
  'expires_at',
  'hash',
  'ok',
  'errors',
  'duration',
  'client_name',
  'client_version',
  'coordinate_totals',
] as const;

export const subscriptionOperationsOrder = [
  'organization',
  'target',
  'timestamp',
  'expires_at',
  'hash',
  'client_name',
  'client_version',
] as const;

export const registryOrder = [
  'total',
  'target',
  'hash',
  'name',
  'body',
  'operation_kind',
  'coordinates',
  'timestamp',
  'expires_at',
] as const;

export const appDeploymentUsageOrder = [
  'target_id',
  'app_name',
  'app_version',
  'last_request',
] as const;

export const operationErrorsOrder = [
  'target',
  'hash_raw',
  'timestamp',
  'expires_at',
  'errors',
] as const;

const UINT32_BYTES = 4;
const DATE_TIME_PAIR_BYTES = UINT32_BYTES * 2;
const UINT32_RANGE = 0x1_0000_0000;

/** Yield operation_collection rows as complete, chunked ClickHouse RowBinary buffers. */
export function serializeRegistryRecordsRowBinary(
  records: readonly ProcessedRegistryRecord[],
): Generator<Buffer> {
  return writeRows(writeRegistryRecord)(records);
}

export function serializeOperationsRowBinary(records: readonly ProcessedOperation[]): Generator<Buffer> {
  return writeRows(writeOperation)(records);
}

export function serializeSubscriptionOperationsRowBinary(
  records: readonly ProcessedSubscriptionOperation[],
): Generator<Buffer> {
  return writeRows(writeSubscriptionOperation)(records);
}

export function serializeAppDeploymentUsageRowBinary(
  records: readonly ProcessedAppDeploymentUsageRecord[],
): Generator<Buffer> {
  return writeRows(writeAppDeploymentUsageRecord)(records);
}

export function serializeOperationErrorsRowBinary(
  records: readonly ProcessedOperationErrorRecord[],
): Generator<Buffer> {
  return writeRows(writeOperationError)(records);
}

const writeDateTimeMilliseconds: Writer<number> = (sink, milliseconds) => {
  // ClickHouse DateTime is encoded as UInt32 seconds since the Unix epoch.
  writeUInt32(sink, Math.floor(milliseconds / 1000));
};

function writeDateTimePair(sink: Sink, firstMilliseconds: number, secondMilliseconds: number) {
  // The adjacent DateTime columns share one capacity check.
  const offset = reserve(sink, DATE_TIME_PAIR_BYTES);
  sink.view.setUint32(offset, Math.floor(firstMilliseconds / 1000), true);
  sink.view.setUint32(
    offset + UINT32_BYTES,
    Math.floor(secondMilliseconds / 1000),
    true,
  );
}

const writeRegistryRecord: Writer<ProcessedRegistryRecord> = (sink, record) => {
  writeUInt32(sink, record.size);
  // LowCardinality(String) has the same RowBinary representation as String.
  writeString(sink, record.target);
  writeString(sink, record.hash);
  // The ClickHouse column is non-nullable String, so missing names use its default.
  writeString(sink, record.name ?? '');
  writeString(sink, record.body);
  writeString(sink, record.operation_kind);
  writeStringArray(sink, record.coordinates);
  writeDateTimePair(sink, record.timestamp, record.expires_at);
};

const writeOperation: Writer<ProcessedOperation> = (sink, record) => {
  writeString(sink, record.organization);
  writeString(sink, record.target);
  writeDateTimePair(sink, record.timestamp, record.expiresAt);
  writeString(sink, record.operationHash);
  writeBool(sink, record.execution.ok);
  writeUInt16(sink, record.execution.errorsTotal);
  // Duration is a UInt64. The incoming report schema bounds it below 2^63.
  writeDuration(sink, record.execution.duration);
  writeString(sink, record.metadata?.client?.name ?? '');
  writeString(sink, record.metadata?.client?.version ?? '');

  const coordinateTotals = record.execution.coordinateTotals ?? {};
  const coordinates = Object.keys(coordinateTotals);
  writeUVarint(sink, coordinates.length);
  for (const coordinate of coordinates) {
    writeString(sink, coordinate);
    writeUInt32(sink, coordinateTotals[coordinate]);
  }
};

function writeDuration(sink: Sink, duration: number) {
  if (!Number.isSafeInteger(duration) || duration < 0) {
    // Preserve the package writer's full UInt64 behavior for out-of-range JS numbers.
    writeUInt64(sink, BigInt(duration));
    return;
  }

  // Durations are normally small safe integers; avoid allocating a BigInt per row.
  const offset = reserve(sink, DATE_TIME_PAIR_BYTES);
  const high = Math.floor(duration / UINT32_RANGE);
  const low = duration - high * UINT32_RANGE;
  sink.view.setUint32(offset, low, true);
  sink.view.setUint32(offset + UINT32_BYTES, high, true);
}

const writeSubscriptionOperation: Writer<ProcessedSubscriptionOperation> = (sink, record) => {
  writeString(sink, record.organization);
  writeString(sink, record.target);
  writeDateTimePair(sink, record.timestamp, record.expiresAt);
  writeString(sink, record.operationHash);
  writeString(sink, record.metadata?.client?.name ?? '');
  writeString(sink, record.metadata?.client?.version ?? '');
};

const writeAppDeploymentUsageRecord: Writer<ProcessedAppDeploymentUsageRecord> =
  (sink, record) => {
    writeString(sink, record.target);
    writeString(sink, record.appName);
    writeString(sink, record.appVersion);
    writeDateTimeMilliseconds(sink, record.lastRequestTimestamp);
  };

const writeOperationError: Writer<ProcessedOperationErrorRecord> = (sink, record) => {
  writeUUID(sink, parseUUID(record.target));
  writeString(sink, record.hash);
  writeDateTimePair(sink, record.timestamp, record.expires_at);
  writeUVarint(sink, record.errors.length);
  for (const [code, path] of record.errors) {
    writeString(sink, code);
    writeString(sink, path);
  }
};

function writeStringArray(sink: Sink, values: readonly string[]) {
  writeUVarint(sink, values.length);
  for (const value of values) writeString(sink, value);
}
