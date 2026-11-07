import { Fragment, useState } from 'react';
import { Proposal, Proposal_ReviewsFragment } from '@/components/target/proposals';
import { ServiceHeading, ServiceHeadingType } from '@/components/target/proposals/service-heading';
import { FragmentType } from '@/gql';
import { ServiceProposalDetails } from './target-proposal-types';
import { targetProposalSchemaStyles } from './target-proposal-schema.css';

export function TargetProposalSchemaPage(props: {
  proposalId: string; // @todo pass to proposal for commenting etc
  services: ServiceProposalDetails[];
  reviews: FragmentType<typeof Proposal_ReviewsFragment>;
}) {
  if (props.services.length) {
    return (
      <div className={targetProposalSchemaStyles.root}>
        {props.services.map(proposed => (
          <Fragment key={proposed.serviceName}>
            <Schema details={proposed} reviews={props.reviews} />
          </Fragment>
        ))}
      </div>
    );
  }
}

function Schema({
  details,
  reviews,
}: {
  details: ServiceProposalDetails;
  reviews: FragmentType<typeof Proposal_ReviewsFragment>;
}) {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <>
      <ServiceHeading
        serviceName={details.serviceName}
        type={
          details.beforeSchema === null
            ? ServiceHeadingType.NEW
            : details.afterSchema === null
              ? ServiceHeadingType.DELETED
              : undefined
        }
        onClick={() => {
          setIsVisible(!isVisible);
        }}
      />
      <Proposal
        {...details}
        reviews={reviews}
        className={targetProposalSchemaStyles.schema({ hidden: !isVisible })}
      />
    </>
  );
}
