import { z } from 'zod';
import type {
  SchemaDiffInput,
  SerializedSchemaChange,
} from '../../api/src/modules/schema/lib/schema-diff';

export type { SerializedSchemaChange } from '../../api/src/modules/schema/lib/schema-diff';

/**
 * A reference to an SDL.
 * For now the SDL is always sent inline. Other kinds (e.g. a pointer to object storage) can be added
 * later without changing the shape of the procedures that accept it.
 */
const SdlRefModel = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('inline'),
    sdl: z.string().min(1),
  }),
]);

export type SdlRef = z.TypeOf<typeof SdlRefModel>;

export const DiffInputModel = z.object({
  existing: SdlRefModel,
  incoming: SdlRefModel,
  /**
   * `composed`: a composed (public API or supergraph) schema.
   * `service`: the SDL of a single service, which can extend types it does not define.
   */
  source: z.enum(['composed', 'service']),
  /** Reduce the changes to what is relevant to the user (simplifies nested changes). */
  filterNestedChanges: z.boolean(),
  /** Drop changes of Federation specific types and directives. */
  filterOutFederationChanges: z.boolean(),
});

export type DiffInput = z.TypeOf<typeof DiffInputModel>;

export type DiffResponse =
  | {
      /** One of the schemas could not be built. */
      status: 'skipped';
    }
  | {
      status: 'completed';
      /** Restore the computed properties with `HiveSchemaChangeModel.parse`. */
      changes: SerializedSchemaChange[];
    };

function resolveSdl(ref: SdlRef): string {
  switch (ref.kind) {
    case 'inline':
      return ref.sdl;
  }
}

export function resolveDiffInput(input: DiffInput): SchemaDiffInput {
  return {
    existingSdl: resolveSdl(input.existing),
    incomingSdl: resolveSdl(input.incoming),
    source: input.source,
    filterNestedChanges: input.filterNestedChanges,
    filterOutFederationChanges: input.filterOutFederationChanges,
  };
}
