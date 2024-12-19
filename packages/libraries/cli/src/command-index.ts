/**
 * This module gathers all the command classes for use in the inferred library
 * which is useful for testing.
 *
 * See {@link Infer} for more information.
 */

import AppCreate from './commands/app/create';
import AppPublish from './commands/app/publish';
import ArtifactsFetch from './commands/artifact/fetch';
import Dev from './commands/dev';
import Introspect from './commands/introspect';
import OperationsCheck from './commands/operations/check';
import SchemaCheck from './commands/schema/check';
import SchemaDelete from './commands/schema/delete';
import SchemaFetch from './commands/schema/fetch';
import SchemaPublish from './commands/schema/publish';
import Whoami from './commands/whoami';
// todo raise issue with respective ESLint lib author about type imports used in JSDoc being marked as "unused"
// eslint-disable-next-line
import type { Infer } from './library/infer';
import { CommandIndexGeneric } from './library/infer';

export const commandIndex = {
  Dev,
  whoami: Whoami,
  introspect: Introspect,
  // app:
  appCreate: AppCreate,
  appPublish: AppPublish,
  // schema:
  schemaPublish: SchemaPublish,
  schemaCheck: SchemaCheck,
  schemaDelete: SchemaDelete,
  schemaFetch: SchemaFetch,
  // artifact:
  artifactFetch: ArtifactsFetch,
  // operations:
  operationsCheck: OperationsCheck,
} satisfies CommandIndexGeneric;

export type CommandIndex = typeof commandIndex;
