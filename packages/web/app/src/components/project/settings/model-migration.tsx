import { ReactElement, ReactNode, useCallback } from 'react';
import { useMutation } from 'urql';
import { Button, Card, Heading, Tooltip } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { RegistryModel } from '@/graphql';
import { useNotifications } from '@/lib/hooks';
import { openChatSupport } from '@/utils';
import { CheckIcon, Cross2Icon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';

const divider = <div className="border-b border-gray-900 mt-4" />;

function Flag(props: { children: ReactNode }): ReactElement {
  return <span className="rounded px-1 py-0.5 bg-gray-900/50 text-gray-300">{props.children}</span>;
}

const noFlag = <span className="text-gray-300">(defaults)</span>;
const crossIcon = <Cross2Icon className="h-6 w-auto text-red-500" />;

function Row(props: {
  action?: ReactNode;
  flag?: ReactNode;
  legacy?: ReactNode;
  modern?: ReactNode;
}) {
  return (
    <div className="flex">
      <div className="p-2 grow shrink basis-0">{props.action ?? null}</div>
      <div className="p-2 grow shrink basis-0 flex items-center text-xs">{props.flag ?? null}</div>
      <div className="p-2 grow-0 shrink-0 w-40 flex items-center gap-2 justify-center">
        {props.legacy ?? null}
      </div>
      <div className="p-2 grow-0 shrink-0 w-40 flex items-center gap-2 justify-center">
        {props.modern ?? null}
      </div>
    </div>
  );
}

function Action(props: { title: ReactNode; description: ReactNode }) {
  return (
    <>
      <p className="font-semibold">{props.title}</p>
      <p className="text-gray-300">{props.description}</p>
    </>
  );
}

const rejected = (
  <Tooltip content="GraphQL Hive will reject the request and CLI command will fail">
    {crossIcon}
  </Tooltip>
);

function Accepted({ gateway }: { gateway: boolean }) {
  return (
    <Tooltip
      content={
        <>
          <p>
            <span className="font-semibold">CDN:</span> Will be updated immediately
          </p>
          <p>
            <span className="font-semibold">Registry:</span> Will be updated immediately
          </p>
          {gateway ? (
            <p>
              <span className="font-semibold">Your Gateway:</span> Will receive the new schema
            </p>
          ) : null}
        </>
      }
    >
      <CheckIcon className="h-6 w-auto text-green-500" />
    </Tooltip>
  );
}

function PartiallyAccepted(props: { gateway: boolean }): ReactElement {
  return (
    <Tooltip
      content={
        <div>
          <p>
            <span className="font-semibold">CDN:</span> Won't be updated
          </p>
          <p>
            <span className="font-semibold">Registry:</span> Will be updated (invalid state)
          </p>
          {props.gateway ? (
            <p>
              <span className="font-semibold">Your Gateway:</span> Won't receive the new schema
            </p>
          ) : null}
        </div>
      }
    >
      <CheckIcon className="h-6 w-auto text-yellow-500" />
    </Tooltip>
  );
}

const available = (
  <Tooltip content="Available">
    <CheckIcon className="h-6 w-auto text-green-500" />
  </Tooltip>
);

const notAvailable = <Tooltip content="Not available">{crossIcon}</Tooltip>;

const ModelMigrationSettings_upgradeProjectRegistryModelMutation = graphql(`
  mutation ModelMigrationSettings_upgradeProjectRegistryModelMutation(
    $input: UpdateProjectRegistryModelInput!
  ) {
    updateProjectRegistryModel(input: $input) {
      ok {
        ...ProjectFields
      }
      error {
        message
      }
    }
  }
`);

const ModelMigrationSettings_ProjectFragment = graphql(`
  fragment ModelMigrationSettings_ProjectFragment on Project {
    type
    cleanId
    registryModel
  }
`);

export function ModelMigrationSettings(props: {
  project: FragmentType<typeof ModelMigrationSettings_ProjectFragment>;
  organizationId: string;
}): ReactElement | null {
  const project = useFragment(ModelMigrationSettings_ProjectFragment, props.project);
  const isStitching = project.type === 'STITCHING';
  const isComposite = isStitching || project.type === 'FEDERATION';
  const notify = useNotifications();

  const [{ fetching }, upgradeMutation] = useMutation(
    ModelMigrationSettings_upgradeProjectRegistryModelMutation,
  );
  const upgrade = useCallback(async () => {
    try {
      const result = await upgradeMutation({
        input: {
          project: project.cleanId,
          organization: props.organizationId,
          model: RegistryModel.Modern,
        },
      });
      if (result.error) {
        notify(`Failed to upgrade: ${result.error.message}`, 'error');
      } else {
        notify('Project upgraded successfully', 'success');
      }
    } catch (err) {
      notify(`Failed to upgrade: ${String(err)}`, 'error');
    }
  }, [upgradeMutation]);

  if (project.registryModel === RegistryModel.Modern) {
    return null;
  }

  return (
    <Card>
      <div className="flex gap-12 items-center">
        <div>
          <Heading className="mb-2 flex items-center justify-between gap-5">
            <span className="shrink-0">Upgrade Project</span>
          </Heading>
          <p className="mb-3 font-light text-gray-300">
            In a few months, access to the old schema registry model will be discontinued as we have
            implemented a new and improved model with superior defaults, following best practices,
            and a streamlined workflow.
          </p>
          <p className="mb-3 font-light text-gray-300">
            A comparison table below should help you understand the differences between the two
            models.
          </p>
        </div>
        <div className="flex shrink-0 gap-4">
          <Button variant="primary" size="large" disabled={fetching} onClick={upgrade}>
            Upgrade my project
          </Button>
          <Button variant="secondary" size="large" onClick={openChatSupport}>
            Live Chat
          </Button>
        </div>
      </div>
      <Tooltip.Provider delayDuration={200}>
        <div className="text-sm pt-4">
          <div className="flex border-b-2 border-gray-900 text-gray-500">
            <div className="p-2 grow shrink basis-0">Action</div>
            <div className="p-2 grow shrink basis-0">CLI Flag</div>
            <div className="p-2 grow-0 shrink-0 w-40 text-center">Legacy</div>
            <div className="p-2 grow-0 shrink-0 w-40 text-center">New</div>
          </div>
          {isComposite ? (
            <>
              <Row
                action={
                  <Action
                    title={`Remove a ${isStitching ? 'service' : 'subgraph'}`}
                    description={`Deleting a ${
                      isStitching ? 'service' : 'subgraph'
                    } from the registry`}
                  />
                }
                legacy={notAvailable}
                modern={available}
              />
              {divider}
            </>
          ) : null}
          <Row
            action={
              <Action
                title="Breaking Changes"
                description="Publishing a schema with a breaking change"
              />
            }
          />
          <Row legacy={rejected} modern={<Accepted gateway={isComposite} />} flag={noFlag} />
          <Row
            legacy={<PartiallyAccepted gateway={isComposite} />}
            modern={<Accepted gateway={isComposite} />}
            flag={<Flag>--force</Flag>}
          />
          <Row
            legacy={<Accepted gateway={isComposite} />}
            modern={<Accepted gateway={isComposite} />}
            flag={<Flag>--experimental_acceptBreakingChanges</Flag>}
          />
          {divider}
          <Row
            action={
              <Action
                title="GraphQL Schema Error"
                description="Publishing a schema with an unknown type or a syntax error"
              />
            }
          />
          <Row legacy={rejected} modern={rejected} flag={noFlag} />
          <Row
            legacy={<PartiallyAccepted gateway={isComposite} />}
            modern={rejected}
            flag={<Flag>--force</Flag>}
          />
          {isComposite ? (
            <>
              {divider}
              <Row
                action={
                  <Action
                    title="Composition Error"
                    description="Publishing a non-spec compliant schema"
                  />
                }
              />
              <Row
                legacy={rejected}
                modern={<PartiallyAccepted gateway={isComposite} />}
                flag={noFlag}
              />
              <Row
                legacy={<PartiallyAccepted gateway={isComposite} />}
                modern={<PartiallyAccepted gateway={isComposite} />}
                flag={<Flag>--force</Flag>}
              />
            </>
          ) : null}
          {isStitching ? (
            <>
              {divider}
              <Row
                action={
                  <Action
                    title="No Service URL"
                    description={
                      <div>
                        Publishing a schema without a service URL <Flag>--url</Flag>
                      </div>
                    }
                  />
                }
              />
              <Row legacy={<Accepted gateway={isComposite} />} modern={rejected} flag={noFlag} />
              <Row
                legacy={<Accepted gateway={isComposite} />}
                modern={rejected}
                flag={<Flag>--force</Flag>}
              />
            </>
          ) : null}
          {divider}
          <div className="p-2">
            <div className="font-semibold">Other changes</div>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                The <Flag>Mark as valid</Flag> button won't be available in the new model as it's no
                longer needed.
              </div>
              <div>
                The <Flag>External Composition</Flag> library and the docker image needs to be
                updated to fully facilitate the new model.
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center gap-4 bg-gray-900/50 p-4 rounded border-2 border-gray-900">
            <QuestionMarkCircledIcon className="h-5 w-auto" />
            <div className="font-light text-gray-300 text-sm">
              If you're having difficulty comprehending the changes,{' '}
              <Button variant="link" onClick={openChatSupport}>
                talk to us
              </Button>{' '}
              through the live chat.
            </div>
          </div>
        </div>
      </Tooltip.Provider>
    </Card>
  );
}
