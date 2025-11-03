import Table from 'cli-table3';
import { Flags } from '@oclif/core';
import Command from '../base-command';
import { graphql } from '../gql';
import { graphqlEndpoint } from '../helpers/config';
import {
  InvalidRegistryTokenError,
  MissingEndpointError,
  MissingRegistryTokenError,
} from '../helpers/errors';
import { Texture } from '../helpers/texture/texture';

const myTokenInfoQuery = graphql(/* GraphQL */ `
  query myTokenInfo($showAll: Boolean!) {
    whoAmI {
      title
      resolvedPermissions(includeAll: $showAll) {
        level
        resolvedResourceIds
        title
        groups {
          title
          permissions {
            isGranted
            permission {
              id
              title
              description
            }
          }
        }
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
    all: Flags.boolean({
      description: 'Also show non-granted permissions.',
      default: false,
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

    const result = await this.registryApi(registry, token).request({
      operation: myTokenInfoQuery,
      variables: {
        showAll: flags.all,
      },
    });

    if (result.whoAmI == null) {
      throw new InvalidRegistryTokenError();
    }

    const data = result.whoAmI;

    // Print header
    this.log(`\n=== ${data.title} ===\n`);

    // Iterate and display each permission group
    for (const permLevel of data.resolvedPermissions) {
      this.log(`Level: ${permLevel.level}`);
      this.log(`Resources: ${permLevel.resolvedResourceIds?.join(', ') ?? '<none>'}`);

      const table = new Table({
        head: ['Group', 'Permission ID', 'Title', 'Granted', 'Description'],
        wordWrap: true,
        style: { head: ['cyan'] },
      });

      for (const group of permLevel.groups) {
        for (const perm of group.permissions) {
          table.push([
            group.title,
            perm.permission.id,
            perm.permission.title,
            perm.isGranted ? '✓' : '❌',
            perm.permission.description,
          ]);
        }
      }

      this.log(table.toString());
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
