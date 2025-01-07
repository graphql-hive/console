import colors from 'colors';
import { Flags } from '@oclif/core';
import Command from '../base-command';
import { graphql } from '../gql';
import { graphqlEndpoint } from '../helpers/config';
import { ACCESS_TOKEN_MISSING } from '../helpers/errors';
import { casesExhausted } from '../helpers/general';
import { Texture } from '../helpers/texture/__';
import { T } from '../helpers/typebox/__';
import { Output } from '../output/__';

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

export default class Whoami extends Command<typeof Whoami> {
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
  static output = [
    Output.success('SuccessWhoami', {
      data: {
        token: T.Object({
          name: T.String(),
        }),
        organization: T.Object({
          slug: T.String(),
          url: T.String({ format: 'uri' }),
        }),
        project: T.Object({
          type: T.String(),
          slug: T.String(),
          url: T.String({ format: 'uri' }),
        }),
        target: T.Object({
          slug: T.String(),
          url: T.String({ format: 'uri' }),
        }),
        authorization: T.Object({
          schema: T.Object({
            publish: T.Boolean(),
            check: T.Boolean(),
          }),
        }),
      },
      text(_, data) {
        const print = createPrinter({
          'Token name:': [Texture.colors.bold(data.token.name)],
          ' ': [''],
          'Organization:': [
            Texture.colors.bold(data.organization.slug),
            Texture.colors.dim(data.organization.url),
          ],
          'Project:': [
            Texture.colors.bold(data.project.slug),
            Texture.colors.dim(data.project.url),
          ],
          'Target:': [Texture.colors.bold(data.target.slug), Texture.colors.dim(data.target.url)],
          '  ': [''],
          'Access to schema:publish': [data.authorization.schema.publish ? access.yes : access.not],
          'Access to schema:check': [data.authorization.schema.check ? access.yes : access.not],
        });

        return print();
      },
    }),
    Output.failure('FailureWhoamiTokenNotFound', {
      data: {
        message: T.String(),
      },
    }),
  ];

  async runResult() {
    const { flags } = await this.parse(Whoami);
    const registry = this.ensure({
      key: 'registry.endpoint',
      legacyFlagName: 'registry',
      args: flags,
      defaultValue: graphqlEndpoint,
      env: 'HIVE_REGISTRY',
    });
    const token = this.ensure({
      key: 'registry.accessToken',
      legacyFlagName: 'token',
      args: flags,
      env: 'HIVE_TOKEN',
      message: ACCESS_TOKEN_MISSING,
    });

    const result = await this.registryApi(registry, token)
      .request({
        operation: myTokenInfoQuery,
      })
      .then(_ => _.tokenInfo);

    if (result.__typename === 'TokenInfo') {
      const organizationUrl = `https://app.graphql-hive.com/${result.organization.slug}`;
      const projectUrl = `${organizationUrl}/${result.project.slug}`;
      const targetUrl = `${projectUrl}/${result.target.slug}`;

      return this.success({
        type: 'SuccessWhoami',
        token: {
          name: result.token.name,
        },
        organization: {
          slug: result.organization.slug,
          url: organizationUrl,
        },
        project: {
          type: result.project.type,
          slug: result.project.slug,
          url: projectUrl,
        },
        target: {
          slug: result.target.slug,
          url: targetUrl,
        },
        authorization: {
          schema: {
            publish: result.canPublishSchema,
            check: result.canCheckSchema,
          },
        },
      });
    }

    if (result.__typename === 'TokenNotFoundError') {
      return this.failureEnvelope({
        exitCode: 0,
        suggestions: [
          `Not sure how to create a token? Learn more at https://docs.graphql-hive.com/features/tokens.`,
        ],
        data: {
          type: 'FailureWhoamiTokenNotFound',
          message: result.message,
        },
      });
    }

    throw casesExhausted(result);
  }
}

function createPrinter(records: { [label: string]: [value: string, extra?: string] }) {
  const labels = Object.keys(records);
  const values = Object.values(records).map(v => v[0]);
  const maxLabelsLen = Math.max(...labels.map(v => v.length)) + 4;
  const maxValuesLen = Math.max(...values.map(v => v.length)) + 4;

  return () => {
    const t = Texture.createBuilder();
    for (const label in records) {
      const [value, extra] = records[label];
      t.line(label.padEnd(maxLabelsLen, ' ') + value.padEnd(maxValuesLen, ' ') + (extra || ''));
    }
    return t.state.value;
  };
}

const access = {
  yes: colors.green('Yes'),
  not: colors.red('No access'),
};
