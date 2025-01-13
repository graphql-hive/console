/**
 * TODO:
 * Once we finish transitioning every command in the CLI to use JSON format output
 * we should migrate this flag to `BaseCommand#baseFlags`.
 */

import { Flags } from '@oclif/core';

export const flagShowOutputSchemaJson = Flags.boolean({
  summary:
    'Show the schema for the JSON format output of this command. JSON format output occurs when you pass the --json flag. The schema is expressed in JSON Schema (json-schema.org).',
  default: false,
  helpGroup: 'GLOBAL',
});

export const flagNameShowOutputSchemaJson = 'show-output-schema-json';
