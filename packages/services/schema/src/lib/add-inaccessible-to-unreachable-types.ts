import { DocumentNode, parse, print } from 'graphql';
import { transformSupergraphToPublicSchema } from '@theguild/federation-composition';
import { ComposerMethodResult } from './compose';
import { addDirectiveOnTypes, getReachableTypes } from './reachable-type-filter';

/**
 * Adds inaccessible directive to unreachable types
 *
 * @param resolveName
 * @param compositionResult
 * @param supergraphSDL
 * @returns
 */

export const addInaccessibleToUnreachableTypes = (
  resolveName: (identity: string, name: string) => string,
  compositionResult: ComposerMethodResult,
  supergraphSDL: DocumentNode,
): ComposerMethodResult => {
  const inaccessibleDirectiveName = resolveName(
    'https://specs.apollo.dev/inaccessible',
    '@inaccessible',
  );
  const federationTypes = new Set([
    resolveName('https://specs.apollo.dev/join', 'FieldSet'),
    resolveName('https://specs.apollo.dev/join', 'Graph'),
    resolveName('https://specs.apollo.dev/link', 'Import'),
    resolveName('https://specs.apollo.dev/link', 'Purpose'),
    resolveName('https://specs.apollo.dev/federation', 'Policy'),
    resolveName('https://specs.apollo.dev/federation', 'Scope'),
    resolveName('https://specs.apollo.dev/join', 'DirectiveArguments'),
  ]);

  if (compositionResult.type === 'failure' || inaccessibleDirectiveName === undefined) {
    // In case there is no inaccessible directive, we can't remove types from the public api schema as everything is reachable.
    return compositionResult;
  }

  // we retrieve the list of reachable types from the public api sdl
  const reachableTypeNames = getReachableTypes(parse(compositionResult.result.sdl!));
  // apollo router does not like @inaccessible on federation types...
  for (const federationType of federationTypes) {
    reachableTypeNames.add(federationType);
  }

  // then we apply the filter to the supergraph SDL (which is the source for the public api sdl)
  supergraphSDL = addDirectiveOnTypes({
    documentNode: supergraphSDL,
    excludedTypeNames: reachableTypeNames,
    directiveName: inaccessibleDirectiveName,
  });
  return {
    ...compositionResult,
    result: {
      ...compositionResult.result,
      supergraph: print(supergraphSDL),
      sdl: print(transformSupergraphToPublicSchema(supergraphSDL)),
    },
  };
};
