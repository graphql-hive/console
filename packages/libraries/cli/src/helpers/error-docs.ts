import {
  errorCatalog,
  errorCategories,
  errorDocsAnchor,
  ExitCode,
  exitCodeDescriptions,
  HiveCLIErrorClass,
} from './errors';

export interface ErrorReference {
  exitCodes: Array<{ code: number; name: string; description: string }>;
  errors: Array<{
    code: number;
    name: string;
    title: string;
    category: string;
    exitCode: number;
    fix: string;
    anchor: string;
  }>;
}

function categoryOf(error: HiveCLIErrorClass): string {
  const category = [...errorCategories].reverse().find(c => error.code >= c.start);
  return category?.name ?? 'Unknown';
}

export function getErrorReference(): ErrorReference {
  const exitCodes = [ExitCode.SUCCESS, ExitCode.ERROR, ExitCode.TIMED_OUT, ExitCode.BAD_INIT];

  return {
    exitCodes: exitCodes.map(code => ({
      code,
      name: ExitCode[code],
      description: exitCodeDescriptions[code],
    })),
    errors: [...errorCatalog]
      .sort((a, b) => a.code - b.code)
      .map(error => ({
        code: error.code,
        name: error.name,
        title: error.title,
        category: categoryOf(error),
        exitCode: error.exitCode,
        fix: error.fix,
        anchor: errorDocsAnchor(error.code),
      })),
  };
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}

export function renderErrorReferenceMarkdown(): string {
  const reference = getErrorReference();
  const lines: string[] = [
    '## Errors',
    '',
    'Every error message ends with its error code in brackets, for example `[103]`, and is printed to stderr. Details of a failed check or publish, such as the list of breaking changes, are printed to stdout.',
    '',
    '### Exit codes',
    '',
    '| Exit code | Name | Meaning |',
    '| --- | --- | --- |',
    ...reference.exitCodes.map(
      exitCode =>
        `| ${exitCode.code} | \`${exitCode.name}\` | ${escapeTableCell(exitCode.description)} |`,
    ),
    '',
    '### Error codes',
    '',
    '| Code | Error | Exit code | Fix |',
    '| --- | --- | --- | --- |',
    ...reference.errors.map(
      error =>
        `| <a id="${error.anchor}"></a>${error.code} | ${escapeTableCell(error.title)} (\`${error.name}\`) | ${error.exitCode} | ${escapeTableCell(error.fix)} |`,
    ),
  ];

  return lines.join('\n');
}
