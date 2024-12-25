import { SchemaHive } from '../helpers/schema';

export namespace SchemaErrorConnection {
  export const toSchemaOutput = (errors: SchemaHive.SchemaErrorConnection) => {
    return errors.nodes.map(error => {
      return {
        message: error.message,
      };
    });
  };
}
