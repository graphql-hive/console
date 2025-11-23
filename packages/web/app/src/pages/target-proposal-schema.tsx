import { Fragment } from 'react';
import { Proposal, ProposalOverview_ReviewsFragment } from '@/components/target/proposals';
import { ServiceHeading, ServiceHeadingType } from '@/components/target/proposals/service-heading';
import { FragmentType } from '@/gql';
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
            <ServiceHeading
              serviceName={proposed.serviceName}
              type={
                proposed.beforeSchema === null
                  ? ServiceHeadingType.NEW
                  : proposed.afterSchema === null
                    ? ServiceHeadingType.DELETED
                    : undefined
              }
            />
            <Proposal {...proposed} reviews={props.reviews} />
          </Fragment>
        ))}
      </div>
    );
  }
}
