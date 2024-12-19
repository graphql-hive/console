import colors from 'colors';
import { Flags } from '@oclif/core';
import Command from '../base-command';
import { graphql } from '../gql';
import { graphqlEndpoint } from '../helpers/config';
import { casesExhausted } from '../helpers/general';
import { tb } from '../helpers/typebox/__';
import { SchemaOutput } from '../schema-output/__';

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
  static output = SchemaOutput.output(
    SchemaOutput.success({
      __typename: tb.Literal('TokenInfo'),
      token: tb.Object({
        name: tb.String(),
      }),
      organization: tb.Object({
        slug: tb.String(),
      }),
      project: tb.Object({
        type: tb.String(),
        slug: tb.String(),
      }),
      target: tb.Object({
        slug: tb.String(),
      }),
      authorization: tb.Object({
        schema: tb.Object({
          publish: tb.Boolean(),
          check: tb.Boolean(),
        }),
      }),
    }),
    SchemaOutput.failure({
      __typename: tb.Literal('TokenNotFoundError'),
      message: tb.String(),
    }),
  );

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
    });

    const result = await this.registryApi(registry, token)
      .request({
        operation: myTokenInfoQuery,
      })
      .then(_ => _.tokenInfo);

    if (result.__typename === 'TokenInfo') {
      const { organization, project, target } = result;

      const organizationUrl = `https://app.graphql-hive.com/${organization.slug}`;
      const projectUrl = `${organizationUrl}/${project.slug}`;
      const targetUrl = `${projectUrl}/${target.slug}`;

      const access = {
        yes: colors.green('Yes'),
        not: colors.red('No access'),
      };

      const print = createPrinter({
        'Token name:': [colors.bold(result.token.name)],
        ' ': [''],
        'Organization:': [colors.bold(organization.slug), colors.dim(organizationUrl)],
        'Project:': [colors.bold(project.slug), colors.dim(projectUrl)],
        'Target:': [colors.bold(target.slug), colors.dim(targetUrl)],
        '  ': [''],
        'Access to schema:publish': [result.canPublishSchema ? access.yes : access.not],
        'Access to schema:check': [result.canCheckSchema ? access.yes : access.not],
      });

      this.log(print());

      return this.success({
        __typename: 'TokenInfo',
        token: {
          name: result.token.name,
        },
        organization: {
          slug: organization.slug,
        },
        project: {
          type: project.type,
          slug: project.slug,
        },
        target: {
          slug: target.slug,
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
        suggestions: [`How to create a token? https://docs.graphql-hive.com/features/tokens`],
        exitCode: 0,
        data: {
          __typename: 'TokenNotFoundError',
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
    const lines: string[] = [];

    for (const label in records) {
      const [value, extra] = records[label];

      lines.push(label.padEnd(maxLabelsLen, ' ') + value.padEnd(maxValuesLen, ' ') + (extra || ''));
    }

    return lines.join('\n');
  };
}
