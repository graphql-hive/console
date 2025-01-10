import { FragmentType, graphql, useFragment } from '@/gql';
import { TargetAccessScope } from '@/gql/graphql';

export { TargetAccessScope };

const CanAccessTarget_MemberFragment = graphql(`
  fragment CanAccessTarget_MemberFragment on Member {
    id
    targetAccessScopes
  }
`);

export function canAccessTarget(
  scope: TargetAccessScope,
  mmember: null | FragmentType<typeof CanAccessTarget_MemberFragment>,
) {
  const member = useFragment(CanAccessTarget_MemberFragment, mmember);

  if (!member) {
    return false;
  }

  return member.targetAccessScopes.includes(scope);
}
