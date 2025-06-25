import { useQuery } from 'urql';
import { ProposalSDL } from '@/components/proposal/proposal-sdl';
import { stageToColor, userText } from '@/components/proposal/util';
import { Subtitle, Title } from '@/components/ui/page';
import { Spinner } from '@/components/ui/spinner';
import { Tag, TimeAgo } from '@/components/v2';
import { graphql } from '@/gql';

const ProposalOverviewQuery = graphql(/** GraphQL  */ `
  query ProposalOverviewQuery($id: ID!) {
    schemaProposal(input: { id: $id }) {
      id
      createdAt
      updatedAt
      commentsCount
      stage
      title
      versions(input: { onlyLatest: true }) {
        edges {
          node {
            id
            schemaSDL
            serviceName
          }
        }
      }
      user {
        id
        email
        displayName
        fullName
      }
      reviews {
        ...ProposalOverview_ReviewsFragment
      }
    }
  }
`);

export function TargetProposalOverviewPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  page: string;
}) {
  const [query] = useQuery({
    query: ProposalOverviewQuery,
    variables: {
      id: props.proposalId,
    },
    requestPolicy: 'cache-and-network',
  });

  const proposal = query.data?.schemaProposal;

  const sdl = /** GraphQL */ `
    extend schema
      @link(
        url: "https://specs.apollo.dev/federation/v2.3"
        import: ["@key", "@shareable", "@inaccessible", "@tag"]
      )
      @link(url: "https://specs.graphql-hive.com/hive/v1.0", import: ["@meta"])
      @meta(name: "priority", content: "tier1")

    directive @meta(
      name: String!
      content: String!
    ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION

    directive @myDirective(a: String!) on FIELD_DEFINITION

    directive @hello on FIELD_DEFINITION

    type Query {
      allProducts: [ProductItf] @meta(name: "owner", content: "hive-team")
      product(id: ID!): ProductItf
    }

    interface ProductItf implements SkuItf @meta(name: "domain", content: "products") {
      id: ID!
      sku: String
      name: String
      package: String
      variation: ProductVariation
      dimensions: ProductDimension
      createdBy: User
      hidden: String @inaccessible
      oldField: String @deprecated(reason: "refactored out")
    }

    interface SkuItf {
      sku: String
    }

    type Product implements ProductItf & SkuItf
      @key(fields: "id")
      @key(fields: "sku package")
      @key(fields: "sku variation { id }")
      @meta(name: "owner", content: "product-team") {
      id: ID! @tag(name: "hi-from-products")
      sku: String @meta(name: "unique", content: "true")
      name: String @hello
      package: String
      variation: ProductVariation
      dimensions: ProductDimension
      createdBy: User
      hidden: String
      reviewsScore: Float!
      oldField: String
    }

    enum ShippingClass {
      STANDARD
      EXPRESS
    }

    type ProductVariation {
      id: ID!
      name: String
    }

    type ProductDimension @shareable {
      size: String
      weight: Float
    }

    type User @key(fields: "email") {
      email: ID!
      totalProductsCreated: Int @shareable
    }

  `;

  return (
    <div className='w-full'>
      {query.fetching && <Spinner />}
      {proposal && (
        <>
          <Subtitle>
            {userText(proposal.user)} proposed <TimeAgo date={proposal.createdAt} />{' '}
          </Subtitle>
          <div className="flex flex-row items-center gap-4">
            <Title>{proposal.title}</Title>
            <Tag color={stageToColor(proposal.stage)}>{proposal.stage}</Tag>
          </div>
          <div className="text-xs">
            Last updated <TimeAgo date={proposal.updatedAt} />
          </div>
          {/* @todo */}
          <ProposalSDL latestProposalVersionId={proposal.versions?.edges?.[0].node.id ?? 'asdf'} reviews={proposal.reviews ?? null} sdl={sdl ?? proposal.versions?.edges?.[0].node.schemaSDL} />
        </>
      )}
    </div>
  );
}
