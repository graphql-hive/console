import BaseCommand from '../base-command';
import { SchemaHive } from '../helpers/schema';
import { indent } from '../helpers/text';
import { SchemaOutput } from '../schema-output/__';

export namespace SchemaWarningConnection {
  export function log(this: BaseCommand<any>, warnings: SchemaHive.SchemaWarningConnection) {
    this.log('');
    this.logWarning(`Detected ${warnings.total} warning${warnings.total > 1 ? 's' : ''}`);
    this.log('');

    warnings.nodes.forEach(warning => {
      const details = [warning.source ? `source: ${this.bolderize(warning.source)}` : undefined]
        .filter(Boolean)
        .join(', ');

      this.log(indent, `- ${this.bolderize(warning.message)}${details ? ` (${details})` : ''}`);
    });
  }

  export const toSchemaOutput = (
    warnings: undefined | null | SchemaHive.SchemaWarningConnection,
  ): SchemaOutput.SchemaWarning[] => {
    return (
      warnings?.nodes.map(_ => ({
        message: _.message,
        source: _.source ?? null,
        line: _.line ?? null,
        column: _.column ?? null,
      })) ?? []
    );
  };
}
