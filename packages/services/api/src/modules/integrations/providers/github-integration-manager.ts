import { Inject, Injectable, InjectionToken, Scope } from 'graphql-modules';
import { App } from '@octokit/app';
import { Octokit } from '@octokit/core';
import { retry } from '@octokit/plugin-retry';
import { RequestError } from '@octokit/request-error';
import type { GitHubIntegration } from '../../../__generated__/types';
import { HiveError } from '../../../shared/errors';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { Logger } from '../../shared/providers/logger';
import { OrganizationSelector, ProjectSelector, Storage } from '../../shared/providers/storage';

export interface GitHubApplicationConfig {
  appId: number;
  privateKey: string;
}

export const GITHUB_APP_CONFIG = new InjectionToken<GitHubApplicationConfig>(
  'GitHubApplicationConfig',
);

type Constructor<T> = new (...args: any[]) => T;

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class GitHubIntegrationManager {
  private logger: Logger;
  private app?: App<{
    Octokit: typeof Octokit & Constructor<ReturnType<typeof retry>>;
  }>;

  constructor(
    logger: Logger,
    private session: Session,
    private storage: Storage,
    private auditLog: AuditLogRecorder,
    @Inject(GITHUB_APP_CONFIG) private config: GitHubApplicationConfig | null,
  ) {
    this.logger = logger.child({
      source: 'GitHubIntegrationManager',
    });

    if (this.config) {
      this.app = new App({
        appId: this.config.appId,
        privateKey: this.config.privateKey,
        log: this.logger,
        Octokit: Octokit.plugin(retry).defaults({
          request: {
            fetch,
          },
        }),
      });
    }
  }

  isEnabled(): boolean {
    return !!this.app;
  }

  async register(
    input: OrganizationSelector & {
      installationId: string;
    },
  ): Promise<void> {
    this.logger.debug(
      'Registering GitHub integration (organization=%s, installationId:%s)',
      input.organizationId,
      input.installationId,
    );
    await this.session.assertPerformAction({
      action: 'gitHubIntegration:modify',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
      },
    });
    this.logger.debug('Updating organization');
    const result = await this.storage.addGitHubIntegration({
      organizationId: input.organizationId,
      installationId: input.installationId,
    });

    await this.auditLog.record({
      eventType: 'ORGANIZATION_UPDATED_INTEGRATION',
      organizationId: input.organizationId,
      metadata: {
        integrationId: input.installationId,
        integrationType: 'GITHUB',
        integrationStatus: 'ENABLED',
      },
    });

    return result;
  }

  async unregister(input: OrganizationSelector): Promise<void> {
    this.logger.debug('Removing GitHub integration (organization=%s)', input.organizationId);

    await this.session.assertPerformAction({
      action: 'gitHubIntegration:modify',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
      },
    });
    this.logger.debug('Updating organization');
    const result = await this.storage.deleteGitHubIntegration({
      organizationId: input.organizationId,
    });

    await this.auditLog.record({
      eventType: 'ORGANIZATION_UPDATED_INTEGRATION',
      organizationId: input.organizationId,
      metadata: {
        integrationId: input.organizationId,
        integrationType: 'GITHUB',
        integrationStatus: 'DISABLED',
      },
    });

    return result;
  }

  async isAvailable(selector: OrganizationSelector): Promise<boolean> {
    this.logger.debug('Checking GitHub integration (organization=%s)', selector.organizationId);

    if (!this.isEnabled()) {
      this.logger.debug('GitHub integration is disabled.');
      return false;
    }

    const installationId = await this.getInstallationId({
      organizationId: selector.organizationId,
    });

    return installationId !== null;
  }

  private async getInstallationId(selector: OrganizationSelector): Promise<number | null> {
    this.logger.debug(
      'Fetching GitHub integration token (organization=%s)',
      selector.organizationId,
    );

    const rawInstallationId = await this.storage.getGitHubIntegrationInstallationId({
      organizationId: selector.organizationId,
    });

    if (!rawInstallationId) {
      this.logger.debug('No installation found. (organization=%s)', selector.organizationId);

      return null;
    }

    this.logger.debug(
      'GitHub installation found. (organization=%s, installationId=%s)',
      selector.organizationId,
      rawInstallationId,
    );

    const installationId = parseInt(rawInstallationId, 10);

    if (Number.isNaN(installationId)) {
      this.logger.error(
        "GitHub installation ID can't be parsed. (organization=%s, installationId=%s)",
        selector.organizationId,
        rawInstallationId,
      );
      throw new Error("GitHub installation ID can't be parsed.");
    }

    return installationId;
  }

  private async getOctokitForOrganization(selector: OrganizationSelector) {
    const installationId = await this.getInstallationId(selector);

    if (!installationId) {
      return null;
    }

    if (!this.app) {
      throw new Error('GitHub Integration not found. Please provide GITHUB_APP_CONFIG.');
    }
    return await this.app.getInstallationOctokit(installationId);
  }

  /**
   * Fetches repositories for the given organization.
   * Returns null in case no integration is found.
   * @param selector
   * @returns
   */
  async getRepositories(
    selector: OrganizationSelector,
  ): Promise<GitHubIntegration['repositories'] | null> {
    this.logger.debug('Fetching repositories');
    const octokit = await this.getOctokitForOrganization(selector);

    if (!octokit) {
      return null;
    }

    return octokit
      .request('GET /installation/repositories')
      .then(result =>
        result.data.repositories.map(repo => {
          return {
            nameWithOwner: repo.full_name,
          };
        }),
      )
      .catch(e => {
        this.logger.warn('Failed to fetch repositories', e);
        this.logger.error(e);
        return Promise.resolve([]);
      });
  }

  async getOrganization(selector: { installation: string }) {
    const organization = await this.storage.getOrganizationByGitHubInstallationId({
      installationId: selector.installation,
    });

    if (!organization) {
      return null;
    }

    await this.session.assertPerformAction({
      action: 'gitHubIntegration:modify',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });

    return organization;
  }

  async createCheckRun(
    input: OrganizationSelector & {
      repositoryName: string;
      repositoryOwner: string;
      name: string;
      sha: string;
      detailsUrl: string | null;
      output?: {
        /** The title of the check run. */
        title: string;
        /** The summary of the check run. This parameter supports Markdown. */
        summary: string;
      };
    },
  ): Promise<
    | {
        success: true;
        data: GitHubCheckRun;
      }
    | {
        success: false;
        error: string;
      }
  > {
    this.logger.debug(
      'Creating check-run (owner=%s, name=%s, sha=%s)',
      input.repositoryOwner,
      input.repositoryName,
      input.sha,
    );

    const octokit = await this.getOctokitForOrganization(input);

    if (!octokit) {
      throw new HiveError(
        'GitHub Integration not found. Please install our GraphQL Hive GitHub Application.',
      );
    }

    try {
      const result = await octokit.request('POST /repos/{owner}/{repo}/check-runs', {
        owner: input.repositoryOwner,
        repo: input.repositoryName,
        name: input.name,
        head_sha: input.sha,
        status: 'in_progress',
        output: input.output ? this.limitOutput(input.output) : undefined,
        details_url: input.detailsUrl ?? undefined,
      });

      this.logger.debug('Check-run created (link=%s)', result.data.url);

      return {
        success: true,
        data: {
          id: result.data.id,
          url: result.data.url,
          repository: input.repositoryName,
          owner: input.repositoryOwner,
          commit: input.sha,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create check-run', error);

      if (isOctokitRequestError(error)) {
        this.logger.debug(
          'GitHub error details (message=%s, status=%s)',
          error.message,
          error.status,
        );

        if (error.message.includes('No commit found for SHA:')) {
          return {
            success: false,
            error: `Commit ${input.sha} not found in repository '${input.repositoryOwner}/${input.repositoryName}'.`,
          };
        }

        if (error.message.includes('organization has an IP allow list')) {
          return {
            success: false,
            error: `Your GitHub Organization has an IP allow list enabled, and our IP address is not permitted to access this resource. Please contact our support team to obtain the IP address.`,
          };
        }

        if (error.status >= 500) {
          return {
            success: false,
            error: `GitHub API couldn't respond to your request in time. Please check Github status page for more information.`,
          };
        }

        return {
          success: false,
          error:
            `Missing permissions for updating check-runs on GitHub repository '${input.repositoryOwner}/${input.repositoryName}'. ` +
            'Please make sure that the GitHub App has access on the repository.',
        };
      }

      throw error;
    }
  }

  async updateCheckRun(args: {
    organizationId: string;
    githubCheckRun: {
      id: number;
      repository: string;
      owner: string;
    };
    conclusion: 'success' | 'failure' | 'neutral';
    output: {
      /** The title of the check run. */
      title: string;
      /** The summary of the check run. This parameter supports Markdown. */
      summary: string;
      /** Use this summary when the `summary` is over the limit of characters  */
      shortSummaryFallback: string;
    };
    detailsUrl: string | null;
  }) {
    this.logger.debug(
      'Update check-run (owner=%s, name=%s, githubCheckRunId=%s)',
      args.githubCheckRun.repository,
      args.githubCheckRun.owner,
      args.githubCheckRun.id,
    );

    const octokit = await this.getOctokitForOrganization({ organizationId: args.organizationId });

    if (!octokit) {
      throw new HiveError(
        'GitHub Integration not found. Please install our GraphQL Hive GitHub Application.',
      );
    }

    const result = await octokit.request('PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}', {
      owner: args.githubCheckRun.owner,
      repo: args.githubCheckRun.repository,
      check_run_id: args.githubCheckRun.id,
      conclusion: args.conclusion,
      output: this.limitOutput(args.output),
      details_url: args.detailsUrl ?? undefined,
    });

    this.logger.debug('Check-run updated (link=%s)', result.data.url);

    return {
      id: result.data.id,
      url: result.data.url,
    };
  }

  async updateCheckRunToSuccess(args: {
    organizationId: string;
    checkRun: {
      owner: string;
      repository: string;
      checkRunId: number;
    };
  }) {
    this.logger.debug(
      'Update check-run (organizationId=%s, checkRun.owner=%s, checkRun.repository=%s, checkRun.id=%s)',
      args.organizationId,
      args.checkRun.owner,
      args.checkRun.repository,
      args.checkRun.checkRunId,
    );
    const octokit = await this.getOctokitForOrganization({
      organizationId: args.organizationId,
    });

    if (!octokit) {
      this.logger.warn(
        'Attempting to update GitHub check-run without GitHub App. Please provide GITHUB_APP_CONFIG. Skipping this step. (organizationId=%s, checkRun.owner=%s, checkRun.repository=%s, checkRun.id=%s)',
        args.organizationId,
        args.checkRun.owner,
        args.checkRun.repository,
        args.checkRun.checkRunId,
      );
      return;
    }

    try {
      const result = await octokit.request(
        'PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}',
        {
          owner: args.checkRun.owner,
          repo: args.checkRun.repository,
          check_run_id: args.checkRun.checkRunId,
          conclusion: 'success',
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      this.logger.debug('Check-run updated (id=%s, link=%s)', result.data.id, result.data.url);

      return {
        type: 'success',
        id: result.data.id,
        url: result.data.url,
      } as const;
    } catch (error) {
      this.logger.error('Failed to update check-run', error);

      if (isOctokitRequestError(error)) {
        this.logger.debug(
          'GitHub error details (message=%s, status=%s)',
          error.message,
          error.status,
        );
      }

      return {
        type: 'error',
        reason: 'Failed to update check-run on GitHub. Please try again later.',
      };
    }
  }

  async enableProjectNameInGithubCheck(input: ProjectSelector) {
    await this.session.assertPerformAction({
      action: 'project:modifySettings',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
    });

    const project = await this.storage.getProject(input);

    if (project.useProjectNameInGithubCheck) {
      return project;
    }

    return this.storage.enableProjectNameInGithubCheck(input);
  }

  private limitOutput(output: { title: string; summary: string; shortSummaryFallback?: string }) {
    if (output.summary.length <= 65_000) {
      return output;
    }

    return {
      title: output.title,
      summary: output.shortSummaryFallback
        ? output.shortSummaryFallback + '\n\nPlease check the details link.'
        : 'Please check the details link.',
    };
  }
}

function isOctokitRequestError(error: unknown): error is RequestError {
  return !!error && typeof error === 'object' && 'code' in error && 'status' in error;
}

export type GitHubCheckRun = {
  /** ID of the GitHub check-run */
  id: number;
  /** Owner of the GitHub repository the GitHub check-run is on. */
  owner: string;
  /** GitHub repository the GitHub check-run is on. */
  repository: string;
  /** Commit SHA, with which the GitHub check-run is connected. */
  commit: string;
  /** URL for viewing the check-run on GitHub. */
  url: string;
};
