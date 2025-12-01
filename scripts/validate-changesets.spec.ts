import { describe, expect, it } from 'vitest';
import {
  isPackageIgnored,
  parseChangesetFrontmatter,
  parsePackageEntries,
  validateChangeset,
} from './validate-changesets';

describe('validate-changesets', () => {
  describe('parseChangesetFrontmatter', () => {
    it('parses valid frontmatter', () => {
      const content = `---
'@graphql-hive/cli': patch
---

Some description here.`;
      expect(parseChangesetFrontmatter(content)).toBe("'@graphql-hive/cli': patch");
    });

    it('parses multi-package frontmatter', () => {
      const content = `---
'@graphql-hive/cli': patch
'@graphql-hive/core': minor
---

Some description here.`;
      expect(parseChangesetFrontmatter(content)).toBe(
        "'@graphql-hive/cli': patch\n'@graphql-hive/core': minor",
      );
    });

    it('returns null for invalid frontmatter', () => {
      const content = `No frontmatter here`;
      expect(parseChangesetFrontmatter(content)).toBeNull();
    });

    it('returns null for unclosed frontmatter', () => {
      const content = `---
'@graphql-hive/cli': patch
Some description here.`;
      expect(parseChangesetFrontmatter(content)).toBeNull();
    });

    it('returns empty string for whitespace-only frontmatter', () => {
      const content = `---

---

Some description here.`;
      expect(parseChangesetFrontmatter(content)).toBe('');
    });

    it('returns null for empty frontmatter (no newline between markers)', () => {
      const content = `---
---

Some description here.`;
      expect(parseChangesetFrontmatter(content)).toBeNull();
    });
  });

  describe('parsePackageEntries', () => {
    it('parses single-quoted package names', () => {
      const frontmatter = "'@graphql-hive/cli': patch";
      expect(parsePackageEntries(frontmatter)).toEqual([
        { packageName: '@graphql-hive/cli', bumpType: 'patch' },
      ]);
    });

    it('parses double-quoted package names', () => {
      const frontmatter = '"@graphql-hive/cli": minor';
      expect(parsePackageEntries(frontmatter)).toEqual([
        { packageName: '@graphql-hive/cli', bumpType: 'minor' },
      ]);
    });

    it('parses unquoted package names', () => {
      const frontmatter = 'hive: major';
      expect(parsePackageEntries(frontmatter)).toEqual([
        { packageName: 'hive', bumpType: 'major' },
      ]);
    });

    it('parses multiple packages', () => {
      const frontmatter = `'@graphql-hive/cli': patch
'@graphql-hive/core': minor
hive: major`;
      expect(parsePackageEntries(frontmatter)).toEqual([
        { packageName: '@graphql-hive/cli', bumpType: 'patch' },
        { packageName: '@graphql-hive/core', bumpType: 'minor' },
        { packageName: 'hive', bumpType: 'major' },
      ]);
    });

    it('returns error for invalid lines', () => {
      const frontmatter = 'invalid line without colon';
      expect(parsePackageEntries(frontmatter)).toEqual([
        { error: 'parse_error', line: 'invalid line without colon' },
      ]);
    });

    it('returns error for invalid bump type', () => {
      const frontmatter = "'@graphql-hive/cli': invalid";
      expect(parsePackageEntries(frontmatter)).toEqual([
        { error: 'parse_error', line: "'@graphql-hive/cli': invalid" },
      ]);
    });
  });

  describe('isPackageIgnored', () => {
    const ignorePatterns = ['@hive/*', 'integration-tests', 'eslint-plugin-hive'];

    it('matches exact package names', () => {
      expect(isPackageIgnored('integration-tests', ignorePatterns)).toBe(true);
      expect(isPackageIgnored('eslint-plugin-hive', ignorePatterns)).toBe(true);
    });

    it('matches glob patterns', () => {
      expect(isPackageIgnored('@hive/api', ignorePatterns)).toBe(true);
      expect(isPackageIgnored('@hive/storage', ignorePatterns)).toBe(true);
      expect(isPackageIgnored('@hive/anything', ignorePatterns)).toBe(true);
    });

    it('does not match non-ignored packages', () => {
      expect(isPackageIgnored('@graphql-hive/cli', ignorePatterns)).toBe(false);
      expect(isPackageIgnored('hive', ignorePatterns)).toBe(false);
      expect(isPackageIgnored('@graphql-hive/core', ignorePatterns)).toBe(false);
    });
  });

  describe('validateChangeset', () => {
    const validPackages = new Set(['@graphql-hive/cli', '@graphql-hive/core', 'hive', '@hive/api']);
    const ignorePatterns = ['@hive/*', 'integration-tests'];

    it('returns no errors for valid changeset', () => {
      const content = `---
'@graphql-hive/cli': patch
---

Fix something.`;
      const errors = validateChangeset('test.md', content, validPackages, ignorePatterns);
      expect(errors).toEqual([]);
    });

    it('returns no errors for multiple valid packages', () => {
      const content = `---
'@graphql-hive/cli': patch
'@graphql-hive/core': minor
---

Fix something.`;
      const errors = validateChangeset('test.md', content, validPackages, ignorePatterns);
      expect(errors).toEqual([]);
    });

    it('returns error for non-existent package', () => {
      const content = `---
'non-existent-package': patch
---

Fix something.`;
      const errors = validateChangeset('test.md', content, validPackages, ignorePatterns);
      expect(errors).toHaveLength(1);
      expect(errors[0].file).toBe('test.md');
      expect(errors[0].message).toContain('does not exist in the monorepo');
    });

    it('returns error for ignored package', () => {
      const content = `---
'@hive/api': patch
---

Fix something.`;
      const errors = validateChangeset('test.md', content, validPackages, ignorePatterns);
      expect(errors).toHaveLength(1);
      expect(errors[0].file).toBe('test.md');
      expect(errors[0].message).toContain('is in the changeset ignore list');
    });

    it('returns error for invalid frontmatter', () => {
      const content = `No frontmatter here`;
      const errors = validateChangeset('test.md', content, validPackages, ignorePatterns);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Could not parse frontmatter');
    });

    it('returns error for whitespace-only frontmatter', () => {
      const content = `---

---

Fix something.`;
      const errors = validateChangeset('test.md', content, validPackages, ignorePatterns);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Changeset has no packages listed');
    });

    it('returns error for unparseable line', () => {
      const content = `---
invalid line
---

Fix something.`;
      const errors = validateChangeset('test.md', content, validPackages, ignorePatterns);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Could not parse line');
    });

    it('returns multiple errors when applicable', () => {
      const content = `---
'non-existent': patch
'@hive/api': minor
---

Fix something.`;
      const errors = validateChangeset('test.md', content, validPackages, ignorePatterns);
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toContain('does not exist');
      expect(errors[1].message).toContain('ignore list');
    });
  });
});
