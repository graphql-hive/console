import 'reflect-metadata';
import type { SchemaChangeType } from '@hive/storage';
import { describe, expect, test } from 'vitest';
import { buildSchemaCheckSuccessGithubOutput } from './schema-publisher';

// The helper only reads `.length`, the contract name and passes change arrays to
// the injected renderer, so a minimal fake change + a simple renderer are enough.
const change = (message: string): SchemaChangeType => ({ message }) as unknown as SchemaChangeType;
const renderChanges = (changes: ReadonlyArray<SchemaChangeType>): string =>
  changes.map(c => (c as unknown as { message: string }).message).join('\n');

describe('buildSchemaCheckSuccessGithubOutput', () => {
  test('reports a contract-only change instead of "No changes" (#6954)', () => {
    const result = buildSchemaCheckSuccessGithubOutput({
      changes: [],
      contractChanges: [{ contractName: 'public', changes: [change('Field Query.b added')] }],
      renderChanges,
    });

    expect(result.title).not.toBe('No changes');
    expect(result.title).toBe('No breaking changes');
    expect(result.summary).toContain('public');
    expect(result.summary).toContain('Field Query.b added');
  });

  test('still reports "No changes" when neither core nor contracts changed', () => {
    const result = buildSchemaCheckSuccessGithubOutput({
      changes: [],
      contractChanges: [],
      renderChanges,
    });

    expect(result.title).toBe('No changes');
    expect(result.summary).toBe('No changes detected');
    expect(result.shortSummaryFallback).toBe('No changes detected');
  });

  test('treats null core changes and null contract changes as "No changes"', () => {
    const result = buildSchemaCheckSuccessGithubOutput({
      changes: null,
      contractChanges: null,
      renderChanges,
    });

    expect(result.title).toBe('No changes');
  });

  test('treats contracts with empty change lists as "No changes"', () => {
    const result = buildSchemaCheckSuccessGithubOutput({
      changes: [],
      contractChanges: [{ contractName: 'public', changes: [] }],
      renderChanges,
    });

    expect(result.title).toBe('No changes');
  });

  test('preserves existing behavior for core schema changes with no contracts', () => {
    const result = buildSchemaCheckSuccessGithubOutput({
      changes: [change('Field Query.a added')],
      contractChanges: null,
      renderChanges,
    });

    expect(result.title).toBe('No breaking changes');
    expect(result.summary).toContain('Field Query.a added');
    // No contract section when there are no contract changes.
    expect(result.summary).not.toContain('Contract "');
  });

  test('lists both core and per-contract changes when both are present', () => {
    const result = buildSchemaCheckSuccessGithubOutput({
      changes: [change('Field Query.a added')],
      contractChanges: [{ contractName: 'public', changes: [change('Field Query.b added')] }],
      renderChanges,
    });

    expect(result.title).toBe('No breaking changes');
    expect(result.summary).toContain('Field Query.a added');
    expect(result.summary).toContain('## Contract "public"');
    expect(result.summary).toContain('Field Query.b added');
  });
});
