import { Flags } from '@oclif/core';
import Command from '../base-command';
import { graphql } from '../gql';
import { graphqlEndpoint } from '../helpers/config';
import { Errors } from '../helpers/errors';
import {
  flagNameShowOutputSchemaJson,
  flagShowOutputSchemaJson,
} from '../helpers/flag-show-output-schema-json';
import { neverCase } from '../helpers/general';
import { Texture } from '../helpers/texture/texture';
import { T } from '../helpers/typebox/_namespace';
import { Output } from '../output/_namespace';

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
  public static enableJsonFlag = true;
  static description = 'shows information about the current token';
  static flags = {
    [flagNameShowOutputSchemaJson]: flagShowOutputSchemaJson,
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
  static output = Output.define(
    Output.defineCaseSuccess('SuccessContext', {
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
      text(t, data) {
        const yesNo = (value: boolean) =>
          value ? Texture.colors.green('Yes') : Texture.colors.red('No access');

        t.columns({
          rows: [
            ['Token name:', Texture.colors.bold(data.token.name)],
            [],
            [
              'Organization:',
              Texture.inline(
                Texture.colors.bold(data.organization.slug),
                Texture.colors.dim(data.organization.url),
              ),
            ],
            [
              'Project:',
              Texture.inline(
                Texture.colors.bold(data.project.slug),
                Texture.colors.dim(data.project.url),
              ),
            ],
            [
              'Target:',
              Texture.inline(
                Texture.colors.bold(data.target.slug),
                Texture.colors.dim(data.target.url),
              ),
            ],
            [],
            ['Access to schema:publish', yesNo(data.authorization.schema.publish)],
            ['Access to schema:check', yesNo(data.authorization.schema.check)],
          ],
        });
      },
    }),
    Output.defineCaseFailure('FailureTokenNotFound', {
      data: {
        message: T.String(),
      },
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
      message: Errors.Messages.accessTokenMissing,
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

      return this.successData({
        // type: 'SuccessContext',
        // token: {
        //   name: result.token.name,
        // },
        // organization: {
        //   slug: result.organization.slug,
        //   url: organizationUrl,
        // },
        // project: {
        //   type: result.project.type,
        //   slug: result.project.slug,
        //   url: projectUrl,
        // },
        // target: {
        //   slug: result.target.slug,
        //   url: targetUrl,
        // },
        // authorization: {
        //   schema: {
        //     publish: result.canPublishSchema,
        //     check: result.canCheckSchema,
        //   },
        // },
      });
    }

    if (result.__typename === 'TokenNotFoundError') {
      return this.failure({
        // exitCode: 0,
        // suggestions: [
        //   `Not sure how to create a token? Learn more at https://docs.graphql-hive.com/features/tokens.`,
        // ],
        // data: {
        //   type: 'FailureTokenNotFound',
        //   message: result.message,
        // },
      });
    }

    throw neverCase(result);
  }
}
