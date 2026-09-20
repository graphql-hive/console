import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import { PermissionScopeItem } from '@/components/organization/Permissions';
import { Button } from '@/components/base/button/button';
import { Callout } from '@/components/ui/callout';
import { InputCopy } from '@/components/ui/input-copy';
import { graphql } from '@/gql';
import { TargetAccessScope } from '@/gql/graphql';
import { RegistryAccessScope } from '@/lib/access/common';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RegistryTokenForm,
  RegistryTokenFormSchema,
  type RegistryTokenFormValues,
} from './registry-token-form';

export const CreateAccessToken_CreateTokenMutation = graphql(`
  mutation CreateAccessToken_CreateToken($input: CreateTokenInput!) {
    createToken(input: $input) {
      ok {
        selector {
          organizationSlug
          projectSlug
          targetSlug
        }
        createdToken {
          id
          name
          alias
          date
          lastUsedAt
        }
        secret
      }
      error {
        message
      }
    }
  }
`);

export function CreateAccessTokenModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const [session, setSession] = useState(0);

  return (
    <ModalContent
      key={session}
      open={props.isOpen}
      onOpenChangeComplete={open => {
        if (!open) {
          setSession(s => s + 1);
        }
      }}
      organizationSlug={props.organizationSlug}
      projectSlug={props.projectSlug}
      targetSlug={props.targetSlug}
      toggleModalOpen={props.toggleModalOpen}
    />
  );
}

function getFinalTargetAccessScopes(
  selectedScope: 'no-access' | TargetAccessScope,
): Array<TargetAccessScope> {
  if (selectedScope === 'no-access') {
    return [];
  }
  if (selectedScope === TargetAccessScope.RegistryWrite) {
    return [TargetAccessScope.RegistryRead, TargetAccessScope.RegistryWrite];
  }
  return [TargetAccessScope.RegistryRead];
}

export function ModalContent(props: {
  open: boolean;
  onOpenChangeComplete?: (open: boolean) => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  toggleModalOpen: () => void;
}) {
  const { toast } = useToast();
  const [selectedScope, setSelectedScope] = useState<'no-access' | TargetAccessScope>('no-access');

  const form = useForm<RegistryTokenFormValues>({
    mode: 'onChange',
    resolver: zodResolver(RegistryTokenFormSchema),
    defaultValues: {
      tokenDescription: '',
    },
  });

  const [mutation, mutate] = useMutation(CreateAccessToken_CreateTokenMutation);

  async function onSubmit(values: RegistryTokenFormValues) {
    const { error } = await mutate({
      input: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
        name: values.tokenDescription,
        organizationScopes: [],
        projectScopes: [],
        targetScopes: getFinalTargetAccessScopes(selectedScope),
      },
    });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to create token',
        description: error.message,
      });
    }
  }

  const noPermissionsSelected = selectedScope === 'no-access';
  const created = mutation.data?.createToken.ok;

  if (created) {
    return (
      <Dialog
        open={props.open}
        onOpenChange={props.toggleModalOpen}
        onOpenChangeComplete={props.onOpenChangeComplete}
        width="lg"
        title="Token successfully created!"
        attrs={{ 'data-cy': 'registry-token-created' }}
        footer={
          <Button data-cy="close" onSurface="raised" onClick={props.toggleModalOpen}>
            Ok, got it!
          </Button>
        }
      >
        <CreatedTokenContent secret={created.secret} />
      </Dialog>
    );
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.toggleModalOpen}
      onOpenChangeComplete={props.onOpenChangeComplete}
      width="lg"
      title="Create an access token"
      description="To access Hive Console, your application or tool needs an active API key."
    >
      <RegistryTokenForm
        form={form}
        onSubmit={onSubmit}
        noPermissionsSelected={noPermissionsSelected}
        onCancel={props.toggleModalOpen}
        permissions={
          <PermissionScopeItem
            dataCy="registry-access-scope"
            onSurface="raised"
            key={selectedScope}
            scope={RegistryAccessScope}
            canManageScope
            checkAccess={() => true}
            onChange={value => {
              if (value === 'no-access') {
                setSelectedScope('no-access');
                return;
              }
              setSelectedScope(value);
            }}
            possibleScope={Object.values(RegistryAccessScope.mapping)}
            initialScope={selectedScope}
            selectedScope={selectedScope}
          />
        }
      />
    </Dialog>
  );
}

export function CreatedTokenContent(props: { secret: string }) {
  return (
    <div className="flex flex-col gap-4">
      <InputCopy value={props.secret} onSurface="raised" />
      <Callout type="info">
        This is your unique API key and it is non-recoverable. If you lose this key, you will need
        to create a new one.
      </Callout>
    </div>
  );
}
