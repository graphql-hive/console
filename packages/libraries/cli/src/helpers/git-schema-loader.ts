import { execSync } from 'node:child_process';

function isGlobPath(path: string) {
  const globPattern = /[*?{}\[\]()]/;
  return globPattern.test(path);
}

const filePathPattern = 'file://';

function parseSingleLocalFilePath(schemaPointer: string) {
  if (schemaPointer.includes('://') && !schemaPointer.startsWith(filePathPattern)) {
    return {
      status: 'error' as const,
      error: {
        type: 'path' as const,
        message: 'URL is not a local path.',
      },
    };
  }

  if (isGlobPath(schemaPointer)) {
    return {
      status: 'error' as const,
      error: {
        type: 'path' as const,
        message: 'Path is a glob pattern.',
      },
    };
  }

  return {
    status: 'ok' as const,
    path: schemaPointer.startsWith(filePathPattern)
      ? schemaPointer.substring(0, filePathPattern.length)
      : schemaPointer,
  };
}

const buildShowGitFileCommand = (commit: string, path: string) => `git show ${commit}:${path}`;

function loadGitFile(commit: string, path: string) {
  try {
    const sdl = execSync(buildShowGitFileCommand(commit, path), { cwd: process.cwd() }).toString();
    return {
      status: 'ok' as const,
      sdl,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        status: 'error' as const,
        error: {
          type: 'git' as const,
          message: 'Failed to load schema SDL.\n' + error.message,
          path,
        },
      };
    }
    throw error;
  }
}

export function loadSchemaFromGitHistory(schemaPointer: string, commit: string) {
  const pathResult = parseSingleLocalFilePath(schemaPointer);
  if (pathResult.error) {
    return pathResult;
  }
  const fileResult = loadGitFile(commit, pathResult.path);
  return fileResult;
}
