import { useEffect, useState } from 'react';
import { useClient } from 'urql';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { Button } from '@/components/base/button/button';
import { VirtualLogList } from '@/components/ui/virtual-log-list';
import { DocumentType, graphql } from '@/gql';

const SubscribeToOIDCIntegrationLogSubscription = graphql(`
  subscription oidcProviderLog($oidcIntegrationId: ID!) {
    oidcIntegrationLog(input: { oidcIntegrationId: $oidcIntegrationId }) {
      timestamp
      message
    }
  }
`);

type OIDCLogEventType = DocumentType<
  typeof SubscribeToOIDCIntegrationLogSubscription
>['oidcIntegrationLog'];

export function DebugOIDCIntegrationModal(props: {
  open: boolean;
  close: () => void;
  /** Fires once the close transition has finished; the parent remounts the modal on it. */
  onOpenChangeComplete: (open: boolean) => void;
  oidcIntegrationId: string;
}) {
  const client = useClient();

  const [isSubscribing, setIsSubscribing] = useState(true);

  const [logs, setLogs] = useState<Array<OIDCLogEventType>>([]);

  useEffect(() => {
    if (props.open && isSubscribing && props.oidcIntegrationId) {
      setLogs(logs => [
        ...logs,
        {
          __typename: 'OIDCIntegrationLogEvent',
          timestamp: new Date().toISOString(),
          message: 'Subscribing to logs...',
        },
      ]);
      const sub = client
        .subscription(SubscribeToOIDCIntegrationLogSubscription, {
          oidcIntegrationId: props.oidcIntegrationId,
        })
        .subscribe(next => {
          if (next.data?.oidcIntegrationLog) {
            const log = next.data.oidcIntegrationLog;
            setLogs(logs => [...logs, log]);
          }
        });

      return () => {
        setLogs(logs => [
          ...logs,
          {
            __typename: 'OIDCIntegrationLogEvent',
            timestamp: new Date().toISOString(),
            message: 'Stopped subscribing to logs...',
          },
        ]);

        sub.unsubscribe();
      };
    }
  }, [props.oidcIntegrationId, isSubscribing, props.open]);

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.close}
      onOpenChangeComplete={props.onOpenChangeComplete}
      width="xl"
      title="Debug OpenID Connect Integration"
      description="Here you can see to the live logs of users attempting to sign in. It can help identifying issues with the OpenID Connect configuration."
      footer={
        <>
          <Button type="button" onClick={props.close} tabIndex={0} variant="destructive">
            Close
          </Button>
          <Button
            type="button"
            onSurface="raised"
            onClick={() => {
              setIsSubscribing(isSubscribed => !isSubscribed);
            }}
          >
            {isSubscribing ? 'Stop subscription' : 'Subscribe to logs'}
          </Button>
        </>
      }
    >
      <VirtualLogList logs={logs} className="h-[300px]" />
    </Dialog>
  );
}
