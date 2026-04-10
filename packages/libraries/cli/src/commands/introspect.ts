import { writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { buildSchema, introspectionFromSchema } from 'graphql';
import { Args, Flags } from '@oclif/core';
import Command from '../base-command';
import {
  IntrospectionError,
  UnexpectedError,
  UnsupportedFileExtensionError,
} from '../helpers/errors';
import { loadSchema } from '../helpers/schema';

export default class Introspect extends Command<typeof Introspect> {
  static description = 'introspects a GraphQL Schema';
  static flags = {
    write: Flags.string({
      aliases: ['W'],
      description: 'Write to a file (possible extensions: .graphql, .gql, .gqls, .graphqls, .json)',
    }),
    header: Flags.string({
      aliases: ['H'],
      description: 'HTTP header to add to the introspection request (in key:value format)',
      multiple: true,
    }),
    type: Flags.string({
      aliases: ['t'],
      description:
        "Type of the endpoint (possible types: 'federation', 'graphql')." +
        ' If not provided federation introspection followed by graphql introspection is attempted.',
    }),
  };

  static args = {
    location: Args.string({
      name: 'location',
      required: true,
      description: 'GraphQL Schema location (URL or file path/glob)',
      hidden: false,
    }),
  };

  async run() {
    const { flags, args } = await this.parse(Introspect);
    const headers = flags.header?.reduce(
      (acc, header) => {
        const [key, ...values] = header.split(':');

        return {
          ...acc,
          [key]: values.join(':'),
        };
      },
      {} as Record<string, string>,
    );

    let schema = await loadSchema(
      !flags['type']
        ? 'first-federation-then-graphql-introspection'
        : flags['type'] === 'federation'
          ? 'only-federation-introspection'
          : 'only-graphql-introspection',
      args.location,
      {
        headers,
        logger: this.logger,
      },
    ).catch(err => {
      this.logFailure(err);
      throw new IntrospectionError();
    });

    if (!schema) {
      throw new UnexpectedError('Unable to load schema');
    }

    if (!flags.write) {
      this.log(schema);
      return;
    }

    if (flags.write) {
      const filepath = resolve(process.cwd(), flags.write);

      switch (extname(flags.write.toLowerCase())) {
        case '.graphql':
        case '.gql':
        case '.gqls':
        case '.graphqls':
          writeFileSync(filepath, schema, 'utf8');
          break;
        case '.json': {
          const schemaObject = buildSchema(schema, {
            assumeValidSDL: true,
            assumeValid: true,
          });
          writeFileSync(
            filepath,
            JSON.stringify(introspectionFromSchema(schemaObject), null, 2),
            'utf8',
          );
          break;
        }
        default:
          throw new UnsupportedFileExtensionError(flags.write, [
            '.graphql',
            '.gql',
            '.gqls',
            '.graphqls',
            '.json',
          ]);
      }

      this.logSuccess(`Saved to ${filepath}`);
    }
  }
}
