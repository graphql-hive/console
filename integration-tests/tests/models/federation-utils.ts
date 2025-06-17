import { ProjectType } from 'testkit/gql/graphql';
import { createCLI } from '../../testkit/cli';
import { prepareProject } from '../../testkit/registry-models';

export type FFValue = boolean | string[];
export type FeatureFlags = [string, FFValue][];

export const cases = [
  ['default' as const, [] as FeatureFlags],
  [
    'compareToPreviousComposableVersion' as const,
    [['compareToPreviousComposableVersion', true]] as FeatureFlags,
  ],
  ['@apollo/federation' as const, [] as FeatureFlags],
] as const;

export const isLegacyComposition = (caseName: string) => caseName === '@apollo/federation';

export async function prepare(
  featureFlags: Array<[string, FFValue]> = [],
  legacyComposition = false,
) {
  const { tokens, setFeatureFlag, setNativeFederation, cdn } = await prepareProject(
    ProjectType.Federation,
  );

  for await (const [name, value] of featureFlags) {
    await setFeatureFlag(name, value);
  }

  if (legacyComposition === true) {
    await setNativeFederation(false);
  }

  return {
    cli: createCLI(tokens.registry),
    cdn,
  };
}
