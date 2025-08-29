import { Proposal, ProposalOverview_ReviewsFragment } from '@/components/proposal';
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
      <div className="w-full">
        {props.services.map(proposed => {
          return (
            <Proposal
              key={proposed.serviceName}
              {...proposed}
              reviews={props.reviews}
            />
          );
        })}
      </div>
    );
  }
}
