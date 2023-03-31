import { FragmentType, graphql, useFragment } from '@/gql';
import { OrganizationAccessScope } from '../../graphql';
import { useRedirect } from './common';

export { OrganizationAccessScope } from '../../graphql';

const CanAccessOrganization_MemberFragment = graphql(`
  fragment CanAccessOrganization_MemberFragment on Member {
    organizationAccessScopes
  }
`);

export function canAccessOrganization(
  scope: OrganizationAccessScope,
  mmember: null | FragmentType<typeof CanAccessOrganization_MemberFragment>,
) {
  const member = useFragment(CanAccessOrganization_MemberFragment, mmember);
  if (!member) {
    return false;
  }

  return member.organizationAccessScopes.includes(scope);
}

export function useOrganizationAccess({
  scope,
  member: mmember,
  redirect = false,
}: {
  scope: OrganizationAccessScope;
  member: null | FragmentType<typeof CanAccessOrganization_MemberFragment>;
  redirect?: boolean;
}) {
  const member = useFragment(CanAccessOrganization_MemberFragment, mmember);
  const canAccess = canAccessOrganization(scope, mmember);

  useRedirect({
    canAccess,
    redirectTo: redirect
      ? router => ({
          route: '/[orgId]',
          as: `/${router.query.orgId}`,
        })
      : undefined,
    entity: member,
  });

  return canAccess;
}
