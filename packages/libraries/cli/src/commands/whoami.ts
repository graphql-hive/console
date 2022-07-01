import { Flags } from '@oclif/core';
import colors from 'colors';
import Command from '../base-command';
import { graphqlEndpoint } from '../helpers/config';

export default class WhoAmI extends Command {
  static description = 'checks schema';
  static flags = {
    registry: Flags.string({
      description: 'registry address',
    }),
    token: Flags.string({
      description: 'api token',
    }),
  };

  async run() {
    const { flags } = await this.parse(WhoAmI);

    const registry = this.ensure({
      key: 'registry',
      args: flags,
      defaultValue: graphqlEndpoint,
      env: 'HIVE_REGISTRY',
    });
    const token = this.ensure({
      key: 'token',
      args: flags,
      env: 'HIVE_TOKEN',
    });

    const result = await this.registryApi(registry, token)
      .myTokenInfo()
      .catch(error => {
        this.handleFetchError(error);
      });

    if (result.tokenInfo.__typename === 'TokenInfo') {
      const { tokenInfo } = result;
      const { organization, project, target } = tokenInfo;

      const organizationUrl = `https://app.graphql-hive.com/${organization.cleanId}`;
      const projectUrl = `${organizationUrl}/${project.cleanId}`;
      const targetUrl = `${projectUrl}/${target.cleanId}`;

      const access = {
        yes: colors.green('Yes'),
        not: colors.red('No access'),
      };

      const print = createPrinter({
        'Token name:': [colors.bold(tokenInfo.token.name)],
        ' ': [''],
        'Organization:': [colors.bold(organization.name), colors.dim(organizationUrl)],
        'Project:': [colors.bold(project.name), colors.dim(projectUrl)],
        'Target:': [colors.bold(target.name), colors.dim(targetUrl)],
        '  ': [''],
        'Access to schema:publish': [tokenInfo.canPublishSchema ? access.yes : access.not],
        'Access to schema:check': [tokenInfo.canCheckSchema ? access.yes : access.not],
        'Access to operation:publish': [tokenInfo.canPublishOperations ? access.yes : access.not],
      });

      this.log(print());
    } else if (result.tokenInfo.__typename === 'TokenNotFoundError') {
      this.error(`Token not found. Reason: ${result.tokenInfo.message}`, {
        exit: 0,
        suggestions: [`How to create a token? https://docs.graphql-hive.com/features/tokens`],
      });
    }
  }
}

function createPrinter(records: { [label: string]: [value: string, extra?: string] }) {
  const labels = Object.keys(records);
  const values = Object.values(records).map(v => v[0]);
  const maxLabelsLen = Math.max(...labels.map(v => v.length)) + 4;
  const maxValuesLen = Math.max(...values.map(v => v.length)) + 4;

  return () => {
    const lines: string[] = [];

    for (const label in records) {
      const [value, extra] = records[label];

      lines.push(label.padEnd(maxLabelsLen, ' ') + value.padEnd(maxValuesLen, ' ') + (extra || ''));
    }

    return lines.join('\n');
  };
}
