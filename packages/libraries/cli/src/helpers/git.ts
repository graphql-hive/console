import { exec } from 'child_process';
import { readFileSync } from 'fs';
import ci from 'env-ci';

export type CIRunnerEnvironment = {
  commit: string | undefined | null;
  pullRequestNumber: string | undefined | null;
  repository: string | undefined | null;
  baselineCommit: string | undefined | null;
};

interface CIRunner {
  detect(): boolean;
  env(): CIRunnerEnvironment;
}

const splitBy = '<##>';
const gitLogFormat = [
  /* full hash */ '%H',
  /* Author's name */ '%an',
  /* Author's email */ '%ae',
].join(splitBy);
const latestCommitCommand = `git log -1 --pretty=format:"${gitLogFormat}"`;

function getLatestCommitFromGit() {
  return new Promise<{
    hash: string;
    author: string;
  } | null>(resolve => {
    exec(latestCommitCommand, { cwd: process.cwd() }, (_, stdout) => {
      if (stdout.includes(splitBy)) {
        const [hash, authorName, authorEmail] = stdout.split(splitBy);
        if (hash && authorName) {
          let author = authorName;

          if (authorEmail) {
            author += ` <${authorEmail}>`;
          }

          resolve({
            hash,
            author,
          });
          return;
        }
      }

      resolve(null);
    });
  });
}

function useGitHubAction(): CIRunner {
  return {
    detect() {
      // eslint-disable-next-line no-process-env
      return !!process.env.GITHUB_ACTIONS;
    },
    env() {
      // eslint-disable-next-line no-process-env
      const repository = process.env['GITHUB_REPOSITORY'] ?? null;
      let pullRequestNumber: string | null = null;
      let commit: string | null = null;
      let baselineCommit: string | null = null;

      const isPr =
        // eslint-disable-next-line no-process-env
        process.env.GITHUB_EVENT_NAME === 'pull_request' ||
        // eslint-disable-next-line no-process-env
        process.env.GITHUB_EVENT_NAME === 'pull_request_target';
      // eslint-disable-next-line no-process-env
      const isMergeGroup = process.env.GITHUB_EVENT_NAME === 'merge_group';

      if (isPr || isMergeGroup) {
        try {
          // eslint-disable-next-line no-process-env
          const event = process.env.GITHUB_EVENT_PATH
            ? // eslint-disable-next-line no-process-env
              JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8'))
            : undefined;

          if (event?.pull_request) {
            commit = event.pull_request.head.sha as string;
            pullRequestNumber = String(event.pull_request.number);
          } else if (event?.merge_group) {
            commit = event.merge_group.head_sha as string;
            const match = event.merge_group.head_ref?.match(/\/pr-(\d+)-/);
            pullRequestNumber = match?.[1] ?? null;
            baselineCommit = event.merge_group.base_ref as string;
          }
        } catch {
          // Noop
        }
      }

      return { commit, pullRequestNumber, repository, baselineCommit };
    },
  };
}

export type GitInfo = {
  repository: string | null;
  pullRequestNumber: string | null;
  commit: string | null;
  author: string | null;
  baselineCommit: string | null;
};

export async function gitInfo(noGit: () => void): Promise<GitInfo> {
  let repository: string | null = null;
  let pullRequestNumber: string | null = null;
  let commit: string | null = null;
  let author: string | null = null;
  let baselineCommit: string | null = null;

  const env = ci();

  const githubAction = useGitHubAction();

  if (githubAction.detect()) {
    const env = githubAction.env();
    repository = env.repository ?? null;
    commit = env.commit ?? null;
    pullRequestNumber = env.pullRequestNumber ?? null;
    baselineCommit = env.baselineCommit ?? null;
  }

  if (!commit) {
    commit = env.commit ?? null;
  }

  if (!commit || !author) {
    const git = await getLatestCommitFromGit();
    if (git) {
      if (!commit) {
        commit = git.hash;
      }

      if (!author) {
        author = git.author;
      }
    } else {
      noGit();
    }
  }

  return {
    repository,
    pullRequestNumber,
    commit,
    author,
    baselineCommit,
  };
}
