import { useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useMutation } from 'urql';
import { z } from 'zod';
import { Input } from '@/components/base/input/input';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { PermissionScopeItem } from '@/components/organization/Permissions';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { InputCopy } from '@/components/ui/input-copy';
import { useToast } from '@/components/ui/use-toast';
import { Accordion } from '@/components/v2/accordion';
import { graphql } from '@/gql';
import { TargetAccessScope } from '@/gql/graphql';
import { RegistryAccessScope } from '@/lib/access/common';
import { zodResolver } from '@hookform/resolvers/zod';

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

const createRegistryTokenFormSchema = z.object({
  tokenDescription: z
    .string({
      required_error: 'Token description is required',
    })
    .min(2, {
      message: 'Token description must be at least 2 characters long',
    })
    .max(50, {
      message: 'Token description must be at most 50 characters long',
    })
    .regex(
      /^([a-z]|[0-9]|\s|\.|,|_|-|\/|&)+$/i,
      'Token description restricted to alphanumerical characters, spaces and . , _ - / &',
    ),
});

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

  const form = useForm<z.infer<typeof createRegistryTokenFormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(createRegistryTokenFormSchema),
    defaultValues: {
      tokenDescription: '',
    },
  });

  const [mutation, mutate] = useMutation(CreateAccessToken_CreateTokenMutation);

  async function onSubmit(values: z.infer<typeof createRegistryTokenFormSchema>) {
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
    } else {
      toast({
        title: 'Token created',
        description: 'The token has been successfully created.',
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
          <Button data-cy="close" onClick={props.toggleModalOpen}>
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
      <GenerateTokenContent
        form={form}
        noPermissionsSelected={noPermissionsSelected}
        onSubmit={onSubmit}
        selectedScope={selectedScope}
        setSelectedScope={setSelectedScope}
        toggleModalOpen={props.toggleModalOpen}
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

export function GenerateTokenContent(props: {
  form: UseFormReturn<z.infer<typeof createRegistryTokenFormSchema>>;
  onSubmit: (values: z.infer<typeof createRegistryTokenFormSchema>) => void;
  setSelectedScope: (scope: 'no-access' | TargetAccessScope) => void;
  selectedScope: 'no-access' | TargetAccessScope;
  toggleModalOpen: () => void;
  noPermissionsSelected: boolean;
}) {
  return (
    <Form {...props.form}>
      {/* The buttons stay inside the form: the e2e helper selects the submit through it. */}
      <form
        className="flex flex-col gap-5"
        data-cy="create-registry-token-form"
        onSubmit={props.form.handleSubmit(props.onSubmit)}
      >
        <FormField
          control={props.form.control}
          name="tokenDescription"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Token description"
                  data-cy="description"
                  autoComplete="off"
                  onSurface="raised"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Accordion defaultValue="Permissions">
          <Accordion.Item value="Permissions">
            <Accordion.Header>Registry & Usage</Accordion.Header>
            <Accordion.Content>
              <PermissionScopeItem
                dataCy="registry-access-scope"
                onSurface="raised"
                key={props.selectedScope}
                scope={RegistryAccessScope}
                canManageScope
                checkAccess={() => true}
                onChange={value => {
                  if (value === 'no-access') {
                    props.setSelectedScope('no-access');
                    return;
                  }
                  props.setSelectedScope(value);
                }}
                possibleScope={Object.values(RegistryAccessScope.mapping)}
                initialScope={props.selectedScope}
                selectedScope={props.selectedScope}
              />
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={props.toggleModalOpen}>
            Cancel
          </Button>
          <Button
            type="submit"
            data-cy="submit"
            disabled={
              !props.form.formState.isValid ||
              props.noPermissionsSelected ||
              props.form.formState.isSubmitting
            }
          >
            Generate Token
          </Button>
        </div>
      </form>
    </Form>
  );
}
