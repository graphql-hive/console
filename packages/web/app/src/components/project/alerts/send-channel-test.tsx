import { useState } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { useMutation } from 'urql';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { Button } from '@/components/ui/primitives/button/button';
import { labelVariants } from '@/components/ui/primitives/label/label';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { controlSurface } from '@/components/ui/primitives/shared-styles';
import { Spinner } from '@/components/ui/primitives/spinner/spinner';
import { graphql } from '@/gql';
import { AlertChannelType } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { type ChannelFormValues } from './channel-form';

const SendChannelTest_TestDeliveryChannelMutation = graphql(`
  mutation SendChannelTest_TestDeliveryChannel($input: TestDeliveryChannelInput!) {
    testDeliveryChannel(input: $input) {
      ok {
        idempotencyKey
      }
      error {
        message
        idempotencyKey
      }
    }
  }
`);

const SendChannelTest_TestNewDeliveryChannelMutation = graphql(`
  mutation SendChannelTest_TestNewDeliveryChannel($input: TestNewDeliveryChannelInput!) {
    testNewDeliveryChannel(input: $input) {
      ok {
        idempotencyKey
      }
      error {
        message
        idempotencyKey
      }
    }
  }
`);

type TestOutcome = {
  delivered: boolean;
  message: string | null;
  idempotencyKey: string | null;
};

/** The "Test configuration" block of the create and edit channel sheets. */
export function SendChannelTest(props: {
  /** Null while the channel is being created. */
  channelId: string | null;
  form: UseFormReturn<ChannelFormValues>;
  disabled: boolean;
}) {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const [savedTest, testSaved] = useMutation(SendChannelTest_TestDeliveryChannelMutation);
  const [newTest, testNew] = useMutation(SendChannelTest_TestNewDeliveryChannelMutation);
  const [outcome, setOutcome] = useState<TestOutcome | null>(null);
  const fetching = savedTest.fetching || newTest.fetching;

  async function sendTest() {
    setOutcome(null);
    if (!(await props.form.trigger('type'))) {
      return;
    }
    const type = props.form.getValues('type');
    const isSlack = type === AlertChannelType.Slack;
    const field = isSlack ? 'slackChannel' : 'endpoint';
    if (!(await props.form.trigger(field))) {
      return;
    }
    const value = props.form.getValues(field);
    const destination = isSlack ? { slack: { channel: value } } : { webhook: { endpoint: value } };

    const { result, error } =
      props.channelId === null
        ? await testNew({
            input: {
              project: { bySelector: { organizationSlug, projectSlug } },
              type,
              destination,
            },
          }).then(response => ({
            result: response.data?.testNewDeliveryChannel,
            error: response.error,
          }))
        : await testSaved({ input: { channelId: props.channelId, destination } }).then(
            response => ({ result: response.data?.testDeliveryChannel, error: response.error }),
          );

    if (result?.ok) {
      setOutcome({
        delivered: true,
        message: null,
        idempotencyKey: result.ok.idempotencyKey ?? null,
      });
      return;
    }
    setOutcome({
      delivered: false,
      message: result?.error?.message ?? error?.message ?? 'Unexpected error',
      idempotencyKey: result?.error?.idempotencyKey ?? null,
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-fg-default">
        Verify your configuration with a test event sent from Hive using the configuration above.
      </p>
      <div className="py-2">
        <Button
          type="button"
          onSurface="raised"
          disabled={props.disabled || fetching}
          onClick={() => void sendTest()}
        >
          Test configuration
        </Button>
      </div>
      <div
        className={cn('flex h-32 w-full flex-col rounded-md border', controlSurface.raised)}
        aria-live="polite"
      >
        {fetching ? (
          <div className="flex grow items-center justify-center">
            <Spinner label="Testing configuration" />
          </div>
        ) : outcome ? (
          <ScrollArea axis="both" fill>
            <div className="flex flex-col gap-4 p-3 text-sm">
              <div className="flex flex-col gap-1">
                <span className={labelVariants({ variant: 'caps' })}>Status</span>
                {outcome.delivered ? (
                  <p>Success</p>
                ) : (
                  <p className="text-critical">Failed: {outcome.message}</p>
                )}
              </div>
              {outcome.idempotencyKey ? (
                <div className="flex flex-col">
                  <span className={labelVariants({ variant: 'caps' })}>Idempotency key</span>
                  <div className="flex items-center gap-1">
                    <code className="font-mono text-xs whitespace-nowrap">
                      {outcome.idempotencyKey}
                    </code>
                    <CopyIconButton label="Copy idempotency key" value={outcome.idempotencyKey} />
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        ) : (
          <p className="flex grow items-center justify-center text-sm text-fg-subtle">
            No test results yet.
          </p>
        )}
      </div>
    </div>
  );
}
