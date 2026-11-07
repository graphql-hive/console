import { type ReactElement } from 'react';
import { Callout } from '@/components/ui/callout';
import { InputCopy } from '@/components/ui/input-copy';
import { Link } from '@/components/ui/link';
import { Button } from '@/components/ui/primitives/button/button';
import { Dialog } from '@/components/ui/primitives/overlays/dialog/dialog';
import { FragmentType, graphql, useFragment } from '@/gql';
import { getDocsUrl } from '@/lib/docs-url';
import * as shared from '@/styles/shared.css';
import * as styles from './connect-lab-modal.css';

const Laboratory_IsCDNEnabledFragment = graphql(`
  fragment Laboratory_IsCDNEnabledFragment on Query {
    isCDNEnabled
  }
`);

export const ConnectLabModal = (props: {
  isOpen: boolean;
  close: () => void;
  endpoint: string;
  isCDNEnabled: FragmentType<typeof Laboratory_IsCDNEnabledFragment> | null;
}): ReactElement => {
  const docsUrl = getDocsUrl('/schema-registry/management/targets#registry-access-tokens');
  const isCDNEnabled = useFragment(
    Laboratory_IsCDNEnabledFragment,
    props.isCDNEnabled,
  )?.isCDNEnabled;

  return (
    <ConnectLabModalContent
      isOpen={props.isOpen}
      close={props.close}
      endpoint={props.endpoint}
      isCDNEnabled={isCDNEnabled}
      docsUrl={docsUrl}
    />
  );
};

export const ConnectLabModalContent = (props: {
  isOpen: boolean;
  close: () => void;
  endpoint: string;
  isCDNEnabled?: boolean;
  docsUrl: string;
}) => {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={props.close}
      width="lg"
      title="Use GraphQL Schema Externally"
      description="Hive allow you to consume and use the Laboratory schema with your configured mocks while developing."
      footer={
        <Button onSurface="raised" onClick={() => props.close()}>
          Close
        </Button>
      }
    >
      <div className={shared.stack.gap4}>
        {props?.isCDNEnabled ? (
          <div>
            <h3 className={styles.connectLabModalContentH3}>High-availability CDN:</h3>
            <Callout className={styles.connectLabModalContentCallout} type="info">
              If you want to consume the GraphQL schema for a tool like GraphQL Code Generator, we
              instead recommend using the high-availability CDN instead.
            </Callout>
          </div>
        ) : null}
        <span className={styles.connectLabModalContentSpan}>
          You can use the following endpoint:
        </span>
        <InputCopy value={props.endpoint} onSurface="raised" />
        <span className={styles.connectLabModalContentSpan2}>
          To authenticate, use the following HTTP headers, with a token that has `target:read`
          scope:
        </span>
        {/* A header line with a link inside, not a pill: a code block rather than a Badge. */}
        <code className={styles.connectLabModalContentCode}>
          X-Hive-Key:
          <Link
            as="a"
            variant="secondary"
            target="_blank"
            className={styles.connectLabModalContentLink}
            rel="noreferrer"
            href={props.docsUrl}
          >
            YOUR_TOKEN_HERE
          </Link>
        </code>
        <p className={styles.connectLabModalContentP}>
          Read the{' '}
          <Link as="a" variant="primary" target="_blank" rel="noreferrer" href={props.docsUrl}>
            Managing Tokens
          </Link>{' '}
          chapter in our documentation to create a Registry Access Token.
        </p>
      </div>
    </Dialog>
  );
};
