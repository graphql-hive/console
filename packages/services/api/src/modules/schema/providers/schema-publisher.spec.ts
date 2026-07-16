import { describe, expect, test } from 'vitest';
import { CriticalityLevel } from '@graphql-inspector/core';
import { changesToMarkdown, type MarkdownSchemaChange } from './schema-publisher';

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
