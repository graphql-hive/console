import colors from 'colors';
import BaseCommand from '../base-command';
import { SchemaHive } from '../helpers/schema';
import { indent } from '../helpers/text';

export namespace SchemaErrorConnection {
  export function log(this: BaseCommand<any>, errors: SchemaHive.SchemaErrorConnection) {
    this.logFailure(`Detected ${errors.total} error${errors.total > 1 ? 's' : ''}`);
    this.log('');

    errors.nodes.forEach(error => {
      this.log(String(indent), colors.red('-'), this.bolderize(error.message));
    });
  }
  export const toSchemaOutput = (errors: SchemaHive.SchemaErrorConnection) => {
    return errors.nodes.map(error => {
      return {
        message: error.message,
      };
    });
  };
}
