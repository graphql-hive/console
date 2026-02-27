import { useMutation } from 'urql';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import { RoleSelector } from '../../members/common';

const OIDCDefaultRoleSelector_MemberRoleFragment = graphql(`
  fragment OIDCDefaultRoleSelector_MemberRoleFragment on MemberRole {
    id
    name
    description
  }
`);

const OIDCDefaultRoleSelector_UpdateMutation = graphql(`
  mutation OIDCDefaultRoleSelector_UpdateMutation($input: UpdateOIDCDefaultMemberRoleInput!) {
    updateOIDCDefaultMemberRole(input: $input) {
      ok {
        updatedOIDCIntegration {
          id
          defaultMemberRole {
            ...OIDCDefaultRoleSelector_MemberRoleFragment
          }
        }
      }
      error {
        message
      }
    }
  }
`);

export function OIDCDefaultRoleSelector(props: {
  oidcIntegrationId: string;
  disabled: boolean;
  defaultRole: FragmentType<typeof OIDCDefaultRoleSelector_MemberRoleFragment>;
  memberRoles: Array<FragmentType<typeof OIDCDefaultRoleSelector_MemberRoleFragment>>;
  className?: string;
}) {
  const defaultRole = useFragment(OIDCDefaultRoleSelector_MemberRoleFragment, props.defaultRole);
  const memberRoles = useFragment(OIDCDefaultRoleSelector_MemberRoleFragment, props.memberRoles);
  const [_, mutate] = useMutation(OIDCDefaultRoleSelector_UpdateMutation);
  const { toast } = useToast();

  return (
    <RoleSelector
      className={props.className}
      roles={memberRoles}
      defaultRole={defaultRole}
      disabled={props.disabled}
      onSelect={async role => {
        if (role.id === defaultRole.id) {
          return;
        }

        try {
          const result = await mutate({
            input: {
              oidcIntegrationId: props.oidcIntegrationId,
              defaultMemberRoleId: role.id,
            },
          });

          if (result.data?.updateOIDCDefaultMemberRole.ok) {
            toast({
              title: 'Default member role updated',
              description: `${role.name} is now the default role for new OIDC members`,
            });
            return;
          }

          toast({
            title: 'Failed to update default member role',
            description:
              result.data?.updateOIDCDefaultMemberRole.error?.message ??
              result.error?.message ??
              'Please try again later',
          });
        } catch (error) {
          toast({
            title: 'Failed to update default member role',
            description: 'Please try again later',
            variant: 'destructive',
          });
          console.error(error);
        }
      }}
      isRoleActive={_ => true}
    />
  );
}
