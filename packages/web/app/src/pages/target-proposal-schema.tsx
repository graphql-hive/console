import { Fragment, useState } from 'react';
import { Proposal, ProposalOverview_ReviewsFragment } from '@/components/target/proposals';
import { ServiceHeading, ServiceHeadingType } from '@/components/target/proposals/service-heading';
import { FragmentType } from '@/gql';
import { cn } from '@/lib/utils';
import { ServiceProposalDetails } from './target-proposal-types';

export function TargetProposalSchemaPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string; // @todo pass to proposal for commenting etc
  services: ServiceProposalDetails[];
  reviews: FragmentType<typeof ProposalOverview_ReviewsFragment>;
}) {
  if (props.services.length) {
    return (
      <div className="mb-10 w-full">
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
  reviews: FragmentType<typeof ProposalOverview_ReviewsFragment>;
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
      <Proposal {...details} reviews={reviews} className={cn(!isVisible && 'hidden')} />
    </>
  );
}
