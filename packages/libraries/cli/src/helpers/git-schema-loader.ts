import { execFileSync } from 'node:child_process';
import path from 'node:path/win32';

function isGlobPath(path: string) {
  const globPattern = /[*?{}\[\]()]/;
  return globPattern.test(path);
}

function parseSingleLocalFilePath(schemaPointer: string) {
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
    path: schemaPointer,
  };
}

function loadGitFile(commit: string, path: string) {
  try {
    const sdl = execFileSync('git', ['show', `${commit}:${path}`], {
      cwd: process.cwd(),
    }).toString();
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

export function loadSchemaFromGitHistory(filePointer: string, commit: string) {
  const pathResult = parseSingleLocalFilePath(filePointer);
  if (pathResult.error) {
    return pathResult;
  }
  const fileResult = loadGitFile(commit, pathResult.path);
  return fileResult;
}

export function parseBaselineGitFileReference(schemaPointer: string) {
  // mostly Windows :)
  if (path.isAbsolute(schemaPointer)) {
    return {
      status: 'error' as const,
    };
  }

  const [maybeCommit, maybeFilePath, ...rest] = schemaPointer.split(':');
  if (!maybeCommit || !maybeFilePath || rest.length) {
    return {
      status: 'error' as const,
    };
  }

  return {
    status: 'ok' as const,
    commit: maybeCommit,
    filePath: maybeFilePath,
  };
}
