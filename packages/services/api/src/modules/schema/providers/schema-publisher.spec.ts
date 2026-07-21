import 'reflect-metadata';
import { describe, expect, test } from 'vitest';
import { CriticalityLevel } from '@graphql-inspector/core';
import type { SchemaChangeType } from '@hive/storage';
import {
  buildSchemaCheckSuccessGithubOutput,
  changesToMarkdown,
  type MarkdownSchemaChange,
} from './schema-publisher';

// The helper only reads `.length`, the contract name and passes change arrays to
// the injected renderer, so a minimal fake change + a simple renderer are enough.
const makeChange = (message: string): SchemaChangeType =>
  ({ message }) as unknown as SchemaChangeType;
const renderChanges = (changes: ReadonlyArray<SchemaChangeType>): string =>
  changes.map(c => (c as unknown as { message: string }).message).join('\n');

describe('buildSchemaCheckSuccessGithubOutput', () => {
  test('reports a contract-only change instead of "No changes" (#6954)', () => {
    const result = buildSchemaCheckSuccessGithubOutput({
      changes: [],
      contractChanges: [{ contractName: 'public', changes: [makeChange('Field Query.b added')] }],
      renderChanges,
    });

    expect(result.title).not.toBe('No changes');
    expect(result.title).toBe('No blocking changes');
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
      changes: [makeChange('Field Query.a added')],
      contractChanges: null,
      renderChanges,
    });

    expect(result.title).toBe('No blocking changes');
    expect(result.summary).toContain('Field Query.a added');
    // No contract section when there are no contract changes.
    expect(result.summary).not.toContain('Contract "');
  });

  test('lists both core and per-contract changes when both are present', () => {
    const result = buildSchemaCheckSuccessGithubOutput({
      changes: [makeChange('Field Query.a added')],
      contractChanges: [{ contractName: 'public', changes: [makeChange('Field Query.b added')] }],
      renderChanges,
    });

    expect(result.title).toBe('No blocking changes');
    expect(result.summary).toContain('Field Query.a added');
    expect(result.summary).toContain('## Contract "public"');
    expect(result.summary).toContain('Field Query.b added');
  });
});

describe('changesToMarkdown', () => {
  test('groups changes and includes their status', () => {
    const changes: MarkdownSchemaChange[] = [
      {
        criticality: CriticalityLevel.Breaking,
        message: "Field 'Query.old' was removed",
        isSafeBasedOnUsage: true,
      },
      {
        criticality: CriticalityLevel.Breaking,
        message: "Field 'Query.approved' was removed",
        approvalMetadata: {},
      },
      {
        criticality: CriticalityLevel.Dangerous,
        message: "Enum value 'ACTIVE' was added",
      },
      {
        criticality: CriticalityLevel.NonBreaking,
        message: "Field 'Query.new' was added",
      },
    ];

    expect(changesToMarkdown(changes)).toMatchInlineSnapshot(`
      ## Found 4 changes

      Breaking: 2
      Dangerous: 1
      Safe: 1

      ### Breaking changes
       - Field **Query.old** was removed (safe based on usage)
       - Field **Query.approved** was removed (approved)

      ### Dangrous changes
       - Enum value **ACTIVE** was added

      ### Safe changes
       - Field **Query.new** was added
    `);
  });

  test('prefers the safe based on usage status over approved', () => {
    const change: MarkdownSchemaChange = {
      criticality: CriticalityLevel.Breaking,
      message: "Field 'Query.old' was removed",
      isSafeBasedOnUsage: true,
      approvalMetadata: {},
    };

    expect(changesToMarkdown([change])).toContain(
      'Field **Query.old** was removed (safe based on usage)',
    );
    expect(changesToMarkdown([change])).not.toContain('(approved)');
  });

  test('can omit the list of changes', () => {
    const changes: MarkdownSchemaChange[] = [
      {
        criticality: CriticalityLevel.Breaking,
        message: "Field 'Query.old' was removed",
      },
      {
        criticality: CriticalityLevel.NonBreaking,
        message: "Field 'Query.new' was added",
      },
    ];

    expect(changesToMarkdown(changes, false)).toBe('## Found 2 changes\n\nBreaking: 1\nSafe: 1');
  });
});
