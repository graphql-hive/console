import { SchemaHive } from '../helpers/schema';
import { Output } from '../output/__';

export namespace SchemaWarningConnection {
  export const toSchemaOutput = (
    warnings: undefined | null | SchemaHive.SchemaWarningConnection,
  ): Output.Types.SchemaWarnings => {
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
