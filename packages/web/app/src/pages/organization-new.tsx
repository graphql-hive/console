import { ReactElement } from 'react';
import { LogOutIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import {
  CreateOrganizationForm,
  CreateOrganizationFormSchema,
  type CreateOrganizationFormValues,
} from '@/components/organization/create-organization-form';
import { HiveLogo } from '@/components/ui/brand-icon';
import { DottedBackground } from '@/components/ui/dotted-background';
import { Meta } from '@/components/ui/meta';
import { Button } from '@/components/ui/primitives/button/button';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { graphql } from '@/gql';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from '@tanstack/react-router';
import { organizationNewStyles } from './organization-new.css';

export function NewOrgPage(): ReactElement {
  const router = useRouter();
  return (
    <>
      <Meta title="Create Organization" />
      <DottedBackground className={organizationNewStyles.background}>
        <div className={organizationNewStyles.root}>
          <div className={organizationNewStyles.signOut}>
            <Button
              variant="outline"
              onClick={() =>
                void router.navigate({
                  to: '/logout',
                })
              }
            >
              <LogOutIcon className={organizationNewStyles.signOutIcon} /> Sign out
            </Button>
          </div>
          <Link to="/" className={organizationNewStyles.home}>
            <HiveLogo className={organizationNewStyles.logo} />
          </Link>
          <CreateOrganization />
        </div>
      </DottedBackground>
    </>
  );
}

export const CreateOrganizationMutation = graphql(`
  mutation CreateOrganizationMutation($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      ok {
        createdOrganizationPayload {
          selector {
            organizationSlug
          }
          organization {
            id
            slug
          }
        }
      }
      error {
        message
        inputErrors {
          slug
        }
      }
    }
  }
`);

function CreateOrganization() {
  const [mutation, mutate] = useMutation(CreateOrganizationMutation);
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<CreateOrganizationFormValues>({
    mode: 'onChange',
    resolver: zodResolver(CreateOrganizationFormSchema),
    defaultValues: {
      slug: '',
    },
    disabled: mutation.fetching,
  });

  async function onSubmit(values: CreateOrganizationFormValues) {
    const mutation = await mutate({
      input: {
        slug: values.slug,
      },
    });

    const errorMessage =
      mutation.data?.createOrganization.error?.inputErrors?.slug ||
      mutation.data?.createOrganization.error?.message;

    if (mutation.data?.createOrganization.ok) {
      toast({
        title: 'Organization created',
        description: `You are now an admin of "${values.slug}" organization.`,
      });
      void router.navigate({
        to: '/$organizationSlug',
        params: {
          organizationSlug:
            mutation.data.createOrganization.ok.createdOrganizationPayload.organization.slug,
        },
      });
    } else if (errorMessage) {
      form.setError('slug', {
        type: 'manual',
        message: errorMessage,
      });
    } else if (mutation.error) {
      toast({
        title: 'Failed to create organization',
        description: mutation.error.message,
      });
    }
  }
  return <CreateOrganizationForm form={form} onSubmit={onSubmit} />;
}
