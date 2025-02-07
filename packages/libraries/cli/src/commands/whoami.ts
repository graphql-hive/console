import { Flags } from '@oclif/core';
import Command from '../base-command';
import { graphql } from '../gql';
import { graphqlEndpoint } from '../helpers/config';
import {
  InvalidRegistryTokenError,
  MissingEndpointError,
  MissingRegistryTokenError,
  UnexpectedError,
} from '../helpers/errors';
import { Texture } from '../helpers/texture/texture';

const myTokenInfoQuery = graphql(/* GraphQL */ `
  query myTokenInfo {
    tokenInfo {
      __typename
      ... on TokenInfo {
        token {
          name
        }
        organization {
          slug
        }
        project {
          type
          slug
        }
        target {
          slug
        }
        canPublishSchema: hasTargetScope(scope: REGISTRY_WRITE)
        canCheckSchema: hasTargetScope(scope: REGISTRY_READ)
      }
      ... on TokenNotFoundError {
        message
      }
    }
  }
`);

export default class WhoAmI extends Command<typeof WhoAmI> {
  static description = 'shows information about the current token';
  static flags = {
    'registry.endpoint': Flags.string({
      description: 'registry endpoint',
    }),
    /** @deprecated */
    registry: Flags.string({
      description: 'registry address',
      deprecated: {
        message: 'use --registry.endpoint instead',
        version: '0.21.0',
      },
    }),
    'registry.accessToken': Flags.string({
      description: 'registry access token',
    }),
    /** @deprecated */
    token: Flags.string({
      description: 'api token',
      deprecated: {
        message: 'use --registry.accessToken instead',
        version: '0.21.0',
      },
    }),
  };

  async run() {
    const { flags } = await this.parse(WhoAmI);
    let registry: string, token: string;
    try {
      registry = this.ensure({
        key: 'registry.endpoint',
        legacyFlagName: 'registry',
        args: flags,
        defaultValue: graphqlEndpoint,
        env: 'HIVE_REGISTRY',
        description: WhoAmI.flags['registry.endpoint'].description!,
      });
    } catch (e) {
      throw new MissingEndpointError();
    }

    try {
      token = this.ensure({
        key: 'registry.accessToken',
        legacyFlagName: 'token',
        args: flags,
        env: 'HIVE_TOKEN',
        description: WhoAmI.flags['registry.accessToken'].description!,
      });
    } catch (e) {
      throw new MissingRegistryTokenError();
    }

    const requestId = crypto.randomUUID();

    const result = await this.registryApi(registry, token).request({
      operation: myTokenInfoQuery,
      requestId,
    });

    if (result.tokenInfo.__typename === 'TokenInfo') {
      const { tokenInfo } = result;
      const { organization, project, target } = tokenInfo;

      const organizationUrl = `https://app.graphql-hive.com/${organization.slug}`;
      const projectUrl = `${organizationUrl}/${project.slug}`;
      const targetUrl = `${projectUrl}/${target.slug}`;

      const access = {
        yes: Texture.colors.green('Yes'),
        not: Texture.colors.red('No access'),
      };

      const print = createPrinter({
        'Token name:': [Texture.colors.bold(tokenInfo.token.name)],
        ' ': [''],
        'Organization:': [
          Texture.colors.bold(organization.slug),
          Texture.colors.dim(organizationUrl),
        ],
        'Project:': [Texture.colors.bold(project.slug), Texture.colors.dim(projectUrl)],
        'Target:': [Texture.colors.bold(target.slug), Texture.colors.dim(targetUrl)],
        '  ': [''],
        'Access to schema:publish': [tokenInfo.canPublishSchema ? access.yes : access.not],
        'Access to schema:check': [tokenInfo.canCheckSchema ? access.yes : access.not],
      });

      this.log(print());
    } else if (result.tokenInfo.__typename === 'TokenNotFoundError') {
      this.debug(result.tokenInfo.message);
      throw new InvalidRegistryTokenError(requestId);
    } else {
      throw new UnexpectedError(
        `Token response got an unsupported type: ${(result.tokenInfo as any).__typename}`,
        requestId,
      );
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
