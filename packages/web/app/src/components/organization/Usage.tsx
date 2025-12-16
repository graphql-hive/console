import { ReactElement } from 'react';
import { useQuery } from 'urql';
import { DataWrapper, Table, TBody, Td, Th, THead, Tr } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { Scale } from '../common';

const NumericFormatter = Intl.NumberFormat('en', { notation: 'standard' });

const OrganizationUsageEstimationView_OrganizationFragment = graphql(`
  fragment OrganizationUsageEstimationView_OrganizationFragment on Organization {
    id
    slug
    monthlyOperationsLimit
  }
`);

const Usage_UsageEstimationQuery = graphql(`
  query Usage_UsageEstimationQuery($orgId: ID!, $input: OrganizationUsageEstimationInput!) {
    organization(reference: { byId: $orgId }) {
      id
      usageEstimation(input: $input) {
        operations
      }
    }
  }
`);

export function OrganizationUsageEstimationView(props: {
  organization: FragmentType<typeof OrganizationUsageEstimationView_OrganizationFragment>;
}): ReactElement {
  const organization = useFragment(
    OrganizationUsageEstimationView_OrganizationFragment,
    props.organization,
  );

  const [query] = useQuery({
    query: Usage_UsageEstimationQuery,
    variables: {
      orgId: organization.id,
      input: {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      },
    },
  });

  return (
    <div className="right-4 top-7">
      <DataWrapper query={query} organizationSlug={organization.slug}>
        {result => (
          <Table>
            <THead>
              <Th>Feature</Th>
              <Th align="right">Used</Th>
              <Th align="right">Limit</Th>
            </THead>
            <TBody>
              <Tr>
                <Td>Operations</Td>
                <Td align="right">
                  {result.data.organization?.usageEstimation?.operations
                    ? NumericFormatter.format(result.data.organization?.usageEstimation?.operations)
                    : '----'}
                </Td>
                <Td align="right">
                  {NumericFormatter.format(organization.monthlyOperationsLimit)}
                </Td>
                <Td>
                  <Scale
                    value={result.data.organization?.usageEstimation?.operations ?? 0}
                    size={10}
                    max={organization.monthlyOperationsLimit}
                    className="justify-end"
                  />
                </Td>
              </Tr>
            </TBody>
          </Table>
        )}
      </DataWrapper>
    </div>
  );
}
