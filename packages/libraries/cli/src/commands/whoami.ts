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
import { colors } from '../helpers/texture/texture';

const myTokenInfoQuery = graphql(/* GraphQL */ `
  query myTokenInfo($showAll: Boolean!) {
    whoAmI {
      title
      resolvedPermissions(includeAll: $showAll) {
        level
        resolvedResourceIds
        title
        resolvedPermissionGroups {
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

      const data = [['Group', 'Permission ID', 'Title', 'Granted', 'Description']];

      for (const group of permLevel.resolvedPermissionGroups) {
        for (const perm of group.permissions) {
          data.push([
            group.title,
            perm.permission.id,
            perm.permission.title,
            perm.isGranted ? colors.green('✓') : colors.red('✗'),
            perm.permission.description,
          ]);
        }
      }

      const colWidths = calculateColWidths(data);

      const table = new Table({
        head: data[0],
        wordWrap: true,
        style: { head: ['cyan'] },
        colWidths,
      });

      data.slice(1).forEach(row => table.push(row));

      this.log(table.toString());
    }
  }
}

function calculateColWidths(data: Array<Array<string>>) {
  const colCount = data[0].length;
  const maxColWidths = new Array(colCount).fill(0);

  data.forEach(row => {
    row.forEach((cell, i) => {
      maxColWidths[i] = Math.max(maxColWidths[i], cell.length);
    });
  });

  const terminalWidth = process.stdout.columns || 80;

  // Account for borders: numCols + 1
  const totalBorder = colCount + 1;
  const totalContentWidth = maxColWidths.reduce((a, b) => a + b, 0);

  // Calculate scaled width for each column
  return maxColWidths.map(w => Math.floor((w / totalContentWidth) * (terminalWidth - totalBorder)));
}
