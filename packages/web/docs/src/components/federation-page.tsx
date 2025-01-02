import { ReactElement, ReactNode } from 'react';
import Image from 'next/image';
import { Anchor, CallToAction, Heading } from '@theguild/components';
import { cn } from '../lib';
import { ArrowIcon } from './arrow-icon';
import { FrequentlyAskedFederationQuestions } from './frequently-asked-questions';
import { Hero, HeroLinks } from './hero';
import { InfoCard } from './info-card';
import { Page } from './page';
import federationDiagram from '../../public/federation-diagram.png';
import queryResultImage from '../../public/federation/query-result.png';
import queryImage from '../../public/federation/query.png';
import subgraphsProductsImage from '../../public/federation/subgraphs-products.png';
import subgraphsReviewsImage from '../../public/federation/subgraphs-reviews.png';
import supergraphSchemaImage from '../../public/federation/supergraph-schema.png';

export function FederationPage(): ReactElement {
  return (
    <Page className="text-green-1000 light mx-auto max-w-[90rem] overflow-hidden">
      <Hero className="mx-4 max-sm:mt-2 md:mx-6">
        <Heading
          as="h1"
          size="xl"
          className="mx-auto max-w-3xl text-balance text-center text-white"
        >
          GraphQL Federation
        </Heading>
        <p className="mx-auto w-[512px] max-w-[80%] text-center leading-6 text-white/80">
          Learn what GraphQL Federation is and how to combine multiple GraphQL APIs called subgraphs
          into one unified API (supergraph), and serve data from a single endpoint using a GraphQL
          gateway.
        </p>
        <HeroLinks>
          <CallToAction
            variant="primary-inverted"
            href="/"
            title="Learn about our Open-Source GraphQL Federation Solution - Hive"
          >
            Try Hive for Federation
          </CallToAction>
          <CallToAction
            variant="secondary"
            title="Contact our experts to learn more about GraphQL Federation"
            onClick={() => {
              (window as any).$crisp?.push(['do', 'chat:open']);
            }}
          >
            Contact an Expert
          </CallToAction>
        </HeroLinks>
      </Hero>
      <Intro />
      <WhyFederation />
      <HowFederationWorks className="mx-4 md:mx-6" />
      <WhyHive className="mx-4 md:mx-6" />
      <FrequentlyAskedFederationQuestions className="mx-4 md:mx-6" />
      <GetStarted className="mx-4 md:mx-6" />
    </Page>
  );
}

function Intro() {
  return (
    <div className="relative mt-6 sm:mt-[-72px]">
      <section className="border-beige-400 isolate mx-auto w-[1200px] max-w-full rounded-3xl bg-white sm:max-w-[calc(100%-4rem)] sm:border sm:p-6">
        <div className="relative mx-auto flex w-[1392px] max-w-full flex-col gap-x-4 gap-y-6 md:gap-y-12 lg:flex-row [@media(min-width:1400px)]:gap-x-[120px]">
          <div className="flex grow flex-col gap-12 px-4 md:px-0 lg:w-[650px]">
            <Heading as="h2" size="sm" className="text-green-1000">
              What is GraphQL Federation?
            </Heading>
            <div className="mx-auto space-y-4 leading-6 text-green-800 lg:space-y-6">
              <p>
                As GraphQL APIs grow, they become harder to maintain. Teams step on each other's
                toes, deployments get risky, and making changes becomes slow.
              </p>
              <p>
                GraphQL federation solves these issues by letting you break down your monolithic
                GraphQL API into smaller parts, called subgraphs. Each team can work on their domain
                independently and deploy at their own pace.
              </p>
              <p>
                Thanks to the process called schema composition, the integrity of those subgraphs is
                validated and their schemas are combined into one unified schema, the supergraph.
              </p>
              <p>
                GraphQL clients interact with a single http endpoint served by GraphQL gateway
                (often called GraphQL router) that resolves data of your federated API.
              </p>
            </div>
          </div>
          <div className="relative mx-4 overflow-hidden rounded-3xl bg-blue-400 md:ml-6 md:mr-0">
            <Image
              width={816} // max rendered width
              height={900} // max rendered height
              src={federationDiagram}
              placeholder="blur"
              blurDataURL={federationDiagram.blurDataURL}
              role="presentation"
              className="mx-auto max-h-[400px] w-auto"
              alt="GraphQL Federation architecture diagram showing multiple clients (mobile, desktop, and laptop) sending queries through a GraphQL gateway to three subgraphs connected to various data sources"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function WhyFederation(props: { className?: string }) {
  return (
    <section className={cn('p-6 sm:py-20 md:py-24', props.className)}>
      <Heading as="h2" size="md" className="text-balance text-center">
        Why GraphQL Federation?
      </Heading>
      <div className="relative mx-auto mt-4 space-y-2 text-center lg:max-w-[880px]">
        <p>
          Federated architecture is a powerful, yet advanced concept. <br />
          While it introduces additional complexity, the benefits make it a compelling choice for
          growing organizations.
        </p>
      </div>
      <ul className="mt-6 flex flex-row flex-wrap justify-center gap-2 md:mt-16 md:gap-6">
        <InfoCard
          as="li"
          heading="Domain-Driven Design"
          icon={<PerformanceListItemIcon />}
          className="flex-1 rounded-2xl md:rounded-3xl"
        >
          <p>
            GraphQL federation is perfect for <strong>domain-driven design</strong> or when you want
            to write GraphQL APIS in <strong>different languages</strong>. It allows teams to
            contribute data from their isolated GraphQL APIs (subgraphs) to the shared space called{' '}
            <strong>Supergraph</strong>.
          </p>
          <p>
            This way, each team can focus on their domain and iterate faster, without being blocked
            by other teams.
          </p>
        </InfoCard>
        <InfoCard
          as="li"
          heading="Scalability"
          icon={<PerformanceListItemIcon />}
          className="flex-1 basis-full rounded-2xl md:basis-0 md:rounded-3xl"
        >
          <p>
            Subgraphs can be scaled independently based on their specific requirements, and deployed
            on their own schedule.
          </p>
          <p>
            Different parts of the API can evolve at different paces, and making changes in the
            GraphQL schema no longer requires coordination between teams.
          </p>
        </InfoCard>
        <InfoCard
          as="li"
          heading="Unified API"
          icon={<PerformanceListItemIcon />}
          className="flex-1 basis-full rounded-2xl md:rounded-3xl lg:basis-0"
        >
          <p>
            Clients interact with a single endpoint, served by a <strong>GraphQL Gateway</strong>{' '}
            (sometimes called Router).
          </p>
          <p>
            The complexity of distributed systems is hidden from the client, and the gateway ensures
            that every query reaches its destination.
          </p>
        </InfoCard>
      </ul>
    </section>
  );
}

const HowFederationWorksVariants = {
  first: {
    className: 'bg-beige-100 rounded-3xl rounded-b-none',
    headingClassName: 'text-green-1000',
    paragraphClassName:
      'text-green-800 prose-h4:text-green-1000 prose-strong:text-green-1000 prose-code:text-green-1000 prose-a:text-green-800',
    imagesContainerClassName: 'text-green-800',
    beforeClassName: null,
    afterClassName: null,
    callToActionVariant: 'secondary-inverted' as const,
  },
  second: {
    className: 'bg-blue-400',
    headingClassName: 'text-green-1000',
    paragraphClassName:
      'text-green-800 prose-h4:text-white prose-strong:text-green-1000 prose-code:text-green-1000 prose-a:text-green-800',
    imagesContainerClassName: 'text-green-800',
    beforeClassName: 'before:bg-beige-100 before:shadow-blue-400',
    afterClassName: 'after:shadow-beige-100 after:bg-blue-400',
    callToActionVariant: 'secondary-inverted' as const,
  },
  third: {
    className: 'bg-green-1000 rounded-3xl rounded-t-none',
    headingClassName: 'text-white',
    paragraphClassName:
      'text-white/80 prose-h4:text-white prose-strong:text-white prose-code:text-white prose-a:text-white/80',
    imagesContainerClassName: 'text-white/80',
    beforeClassName: 'before:shadow-green-1000 before:bg-blue-400',
    afterClassName: 'after:bg-green-1000 after:shadow-blue-400',
    callToActionVariant: 'secondary-inverted' as const,
  },
};

function HowFederationWorksSection(props: {
  heading: string;
  description: ReactNode;
  callToAction: string;
  callToActionLink: string;
  callToActionTitle: string;
  index: keyof typeof HowFederationWorksVariants;
  children?: ReactNode;
}) {
  const variant = HowFederationWorksVariants[props.index];

  return (
    <section
      className={cn(
        'relative isolate max-w-full rounded-none px-4 py-6 lg:px-8 lg:py-24 xl:px-16 [@media(min-width:1358px)]:px-24',
        'flex flex-col gap-6 lg:flex-row lg:gap-12',
        variant.className,
        variant.beforeClassName
          ? [
              "before:absolute before:-top-24 before:left-0 before:hidden before:size-24 before:rounded-bl-3xl before:shadow-[0_48px_0_0] before:content-[''] before:lg:block",
              variant.beforeClassName,
            ]
          : null,
        variant.afterClassName
          ? [
              "after:absolute after:right-0 after:top-0 after:hidden after:size-24 after:rounded-tr-3xl after:shadow-[0_-48px_0_0] after:content-[''] after:lg:block",
              variant.afterClassName,
            ]
          : null,
      )}
    >
      <div className="mx-auto flex max-w-full shrink flex-col flex-wrap justify-center gap-x-2">
        <Heading
          as="h3"
          size="sm"
          className={cn('max-w-full text-balance', variant.headingClassName)}
        >
          {props.heading}
        </Heading>

        <div
          className={cn(
            'mt-4 max-w-full space-y-2 lg:mt-6',
            'prose',
            'prose-h4:pt-2 prose-h4:text-lg prose-h4:font-semibold',
            'prose-ul:list-inside prose-ul:list-disc prose-ul:space-y-2',
            'prose-a:underline prose-a:underline-offset-2',
            variant.paragraphClassName,
          )}
        >
          {props.description}
        </div>

        <CallToAction
          variant={variant.callToActionVariant}
          href={props.callToActionLink}
          title={props.callToActionTitle}
          className="mt-6 max-xl:order-1 max-md:w-full xl:mt-12"
        >
          {props.callToAction}
          <ArrowIcon />
        </CallToAction>
      </div>
      <div
        className={cn(
          'mx-auto shrink-0 lg:w-[350px] xl:w-[450px]',
          variant.imagesContainerClassName,
        )}
      >
        {props.children}
      </div>
    </section>
  );
}

function HowFederationWorks(props: { className?: string }) {
  return (
    <div className={cn(props.className)}>
      <div>
        <Heading as="h2" size="md" className="text-center">
          How GraphQL Federation Works?
        </Heading>

        <div className="relative mx-auto mt-4 space-y-2 text-center lg:max-w-[880px]">
          <p>
            {/* Federated GraphQL API involves three components: subgraphs, composition and a gateway. */}
            GraphQL Federation creates a unified API thanks to three key components: subgraphs
            (individual service APIs), a composition layer that validates and combines schemas, and
            a gateway that routes client requests across the distributed system.
          </p>
        </div>
      </div>
      <div className="mt-6 md:mt-16">
        <HowFederationWorksSection
          index="first"
          heading="Subgraphs"
          description={
            <>
              <p>
                GraphQL federation revolutionizes API development through subgraphs - standalone
                GraphQL APIs that form its foundation. In a GraphQL federation architecture, each
                subgraph can be <strong>developed in any language or framework</strong> and{' '}
                <strong>deployed independently</strong> from other components, making it a powerful
                choice for modern applications.
              </p>
              <h4>Defining Subgraph Schemas</h4>
              <p>
                GraphQL federation enables subgraphs to contribute fields to shared types through
                the <code>@key</code> directive.
              </p>
              <p>
                In the presented example, both subgraphs define the <code>Product</code> type with a
                shared <code>id</code>
                field marked by <code>@key(fields: "id")</code>. The "products" subgraph does not
                own the <code>Product</code> type, it contributes the <code>name</code> and{' '}
                <code>price</code> fields. Meanwhile, the "reviews" subgraph extends this type by
                contributing the <code>reviews</code> field.
              </p>
              <p>
                This powerful feature allows teams to evolve their portions of the schema
                independently while maintaining a cohesive API. When a client queries for a
                <code>Product.reviews</code>, the federation layer automatically combines data from
                both subgraphs using the <code>id</code> as the joining key.
              </p>
              <h4>Comparing Federation to Monolithic GraphQL API</h4>
              <p>
                Unlike traditional monolithic GraphQL APIs where teams are constrained to a single
                codebase, language, and tech stack, GraphQL federation offers flexibility. While
                monolithic approaches do provide benefits through shared knowledge and easier team
                collaboration, they come with significant limitations that GraphQL federation
                specifically addresses.
              </p>
              <p>
                The challenges of monolithic GraphQL APIs include slower development cycles due to
                deployment queues, and reduced reliability where a single change can impact the
                performance or stability of the entire API. GraphQL federation transforms these pain
                points by introducing a more modular approach where each team gains control over
                their portion of the API.
              </p>
              <p>Key advantages of GraphQL federation include:</p>
              <ul>
                <li>Teams maintain complete control over their specific GraphQL API domains</li>
                <li>Teams choose their preferred development stack</li>
                <li>Each subgraph can be updated on its own schedule</li>
                <li>Resources can be allocated precisely where needed</li>
              </ul>
              <p>
                By implementing GraphQL federation, organizations can break free from monolithic
                constraints while maintaining the benefits of a unified GraphQL API.
              </p>
            </>
          }
          callToAction="How to publish subgraphs"
          callToActionLink="/docs/get-started/apollo-federation#publish-subgraphs"
          callToActionTitle="Start by publishing your subgraphs to Hive"
        >
          <div className="flex flex-row flex-wrap justify-normal gap-4 lg:flex-col lg:justify-start lg:gap-12">
            <div className="min-w-[300px] max-w-[450px] shrink">
              <Image
                width={476} // max rendered width
                height={260} // max rendered height
                src={subgraphsProductsImage}
                placeholder="blur"
                blurDataURL={subgraphsProductsImage.blurDataURL}
                role="presentation"
                className="z-20 block h-auto w-full rounded-xl shadow-xl"
                alt="GraphQL schema for a products subgraph showing a Query type that returns an array of Products, and a Product type with id, name, and price fields, marked with a Federation @key directive"
              />
              <p className="mt-4 text-center text-sm">
                The Products subgraph written in Go language, allows to query for products and their
                details like name and price.
              </p>
            </div>
            <div className="min-w-[300px] max-w-[450px] shrink">
              <Image
                width={476} // max rendered width
                height={260} // max rendered height
                src={subgraphsReviewsImage}
                placeholder="blur"
                blurDataURL={subgraphsReviewsImage.blurDataURL}
                role="presentation"
                className="z-20 block h-auto w-full rounded-xl shadow-xl"
                alt="GraphQL schema for a reviews subgraph showing the Review type with text and rating fields, and a federated Product type with @key directive and reviews field"
              />
              <p className="mt-4 text-center text-sm">
                The Reviews subgraph written in a Java, contributes reviews to the Product type
                (thanks to the @key directive), making it possible to query for products and their
                reviews.
              </p>
            </div>
          </div>
        </HowFederationWorksSection>
        <HowFederationWorksSection
          index="second"
          heading="Schema Composition and Registry"
          description={
            <>
              <p>
                Schema composition is the pillar of GraphQL federation, enabling you to build a
                unified API across multiple services. It merges subgraph schemas into a single
                schema, called the supergraph schema.
              </p>
              <p>
                The{' '}
                <strong>
                  Supergraph represents the complete, combined graph of all your subgraphs
                </strong>
                . It acts as a blueprint of your entire federated GraphQL API, showing how different
                subgraphs connect and interact. Think of the supergraph as your GraphQL API's source
                of truth - it defines all available types, fields, and their relationships.
              </p>
              <p>
                What makes GraphQL federation unique is its comprehensive schema validation. The
                composition process analyzes every subgraph schema, verifying that all types and
                fields work seamlessly together.{' '}
                <strong>
                  This deep analysis enables GraphQL federation to catch potential issues before
                  they reach production, setting it apart from alternatives like{' '}
                  <Anchor
                    title="Learn Schema Stitching"
                    href="https://the-guild.dev/graphql/stitching/docs"
                  >
                    Schema Stitching
                  </Anchor>
                  .
                </strong>
              </p>
              <p>
                During composition in GraphQL federation, the{' '}
                <strong>
                  Schema Registry validates all possible operations - queries, mutations, and
                  subscriptions - to ensure the GraphQL gateway can properly resolve them.
                </strong>{' '}
                This proactive validation is crucial for preventing runtime errors.
              </p>
              <p>
                The Schema Registry plays a vital role in GraphQL federation's workflow. As a
                centralized repository, it manages subgraph registration, schema validation, and
                supergraph composition. When implementing GraphQL federation, the{' '}
                <Anchor
                  title="Learn why your federated GraphQL setup needs a Schema Registry and why you shouldn't build your own"
                  href="https://graphql.org/conf/2024/schedule/af55205b1d68ec3b3d1b1663e4bd2adf/?name=In-House%20Schema%20Registry%20-%20the%20Good%2C%20the%20Bad%2C%20and%20the%20Ugly"
                >
                  Schema Registry becomes an essential tool for maintaining your distributed GraphQL
                  architecture
                </Anchor>{' '}
                and ensuring successful composition across all subgraphs.
              </p>
            </>
          }
          callToAction="How to use Schema Registry"
          callToActionLink="/docs/schema-registry"
          callToActionTitle="Learn how to use Schema Registry to compose your schema and validate it"
        >
          <div className="min-w-[300px] max-w-[450px] shrink">
            <Image
              width={476} // max rendered width
              height={390} // max rendered height
              src={supergraphSchemaImage}
              placeholder="blur"
              blurDataURL={supergraphSchemaImage.blurDataURL}
              role="presentation"
              className="z-20 block h-auto w-full rounded-xl shadow-xl"
              alt="GraphQL federated schema showing merged Product type with fields from multiple subgraphs, including basic product fields (id, name, price) and nested reviews, demonstrating schema composition in GraphQL Federation"
            />
            <p className="mt-4 text-center text-sm">
              The public GraphQL schema that clients interact with is a combination of subgraph
              schemas.
            </p>
          </div>
        </HowFederationWorksSection>
        <HowFederationWorksSection
          index="third"
          heading="GraphQL Gateway (Router)"
          description={
            <>
              <p>
                <strong>
                  The core promise of GraphQL federation is to have a unified API and serve data
                  from a single endpoint.
                </strong>{' '}
                GraphQL gateway, also known as a GraphQL router, enables that.
              </p>
              <p>
                In a federated GraphQL setup, the gateway uses a supergraph schema to retrieve
                information about the type and field definitions, as well as the subgraphs that
                resolve them.
              </p>
              <h4>Query Planning</h4>
              <p>
                The process of resolving GraphQL requests by the gateway is called query planning.
              </p>
              <p>When the gateway receives a request, it:</p>
              <ul>
                <li>Analyzes the incoming GraphQL query</li>
                <li>Determines which subgraphs are responsible for different fields</li>
                <li>Orchestrates parallel requests to relevant subgraphs</li>
                <li>Aggregates returned data into a single response</li>
              </ul>
              <h4>Essential Features of a Federation Gateway</h4>
              <p>
                GraphQL gateway is a critical part of your federated GraphQL setup as it's the entry
                point for all your GraphQL clients. It has to be fast, reliable and secure.
              </p>
              <p>
                A production-ready GraphQL gateway should offer features like authentication with
                JSON Web Tokens (JWT), role-based access control (RBAC), and a good observability
                story. It should be able to handle a large amount of requests.
              </p>
              <h4>Specification Compliance</h4>
              <p>
                A critical yet{' '}
                <strong>
                  often overlooked aspect of the GraphQL gateway is its correctness and compliance
                  with the{' '}
                  <Anchor
                    href="https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/federation"
                    title="Documentation of Apollo Federation"
                  >
                    Apollo Federation
                  </Anchor>{' '}
                  specification
                </strong>
                . The Federation's effectiveness depends on the gateway's ability to correctly
                resolve queries, mutations and subscriptions.
              </p>
              <p>
                When choosing a federation gateway, verify its compliance with the Apollo Federation
                specification. This will help you prevent unexpected runtime behavior and data
                resolution failures.
              </p>
              <p>
                At{' '}
                <Anchor href="https://the-guild.dev" title="Company behind Hive">
                  The Guild
                </Anchor>
                , we maintain{' '}
                <Anchor
                  title="Apollo Federation Gateway Audit"
                  href="https://the-guild.dev/graphql/hive/federation-gateway-audit"
                >
                  an open-source Federation Testing Suite
                </Anchor>{' '}
                to verify the gateway's specification compliance. This test suite helps ensure your
                gateway correctly implements federation features beyond basic directive support.
              </p>
            </>
          }
          callToAction="How to use a GraphQL Gateway"
          callToActionLink="/docs/gateway"
          callToActionTitle="Learn how to use Hive Gateway to serve your supergraph to clients"
        >
          <div className="flex flex-row flex-wrap justify-normal gap-4 lg:flex-col lg:justify-start lg:gap-12">
            <div className="min-w-[300px] max-w-[450px] shrink">
              <Image
                width={476} // max rendered width
                height={305} // max rendered height
                src={queryImage}
                placeholder="blur"
                blurDataURL={queryImage.blurDataURL}
                role="presentation"
                className="z-20 block h-auto w-full rounded-xl shadow-xl"
                title="A code snippet of a query sent by a client to the GraphQL gateway"
                alt="A code snippet of a query sent by a client to the GraphQL gateway"
              />
              <p className="mt-4 text-center text-sm">
                The gateway resolves the query by sending parts of it to the right subgraphs.
              </p>
            </div>
            <div className="min-w-[300px] max-w-[450px] shrink">
              <Image
                width={476} // max rendered width
                height={390} // max rendered height
                src={queryResultImage}
                placeholder="blur"
                blurDataURL={queryResultImage.blurDataURL}
                role="presentation"
                className="z-20 block h-auto w-full rounded-xl shadow-xl"
                title="A code snippet of response from the gateway to the client"
                alt="A code snippet of response from the gateway to the client"
              />
              <p className="mt-4 text-center text-sm">
                Client receives the data from the gateway in a single response.
              </p>
            </div>
          </div>
        </HowFederationWorksSection>
      </div>
    </div>
  );
}

function PerformanceListItemIcon() {
  return (
    <svg width="24" height="24" fill="currentColor">
      <path d="M5.25 7.5a2.25 2.25 0 1 1 3 2.122v4.756a2.251 2.251 0 1 1-1.5 0V9.622A2.25 2.25 0 0 1 5.25 7.5Zm9.22-2.03a.75.75 0 0 1 1.06 0l.97.97.97-.97a.75.75 0 1 1 1.06 1.06l-.97.97.97.97a.75.75 0 0 1-1.06 1.06l-.97-.97-.97.97a.75.75 0 1 1-1.06-1.06l.97-.97-.97-.97a.75.75 0 0 1 0-1.06Zm2.03 5.03a.75.75 0 0 1 .75.75v3.128a2.251 2.251 0 1 1-1.5 0V11.25a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

function WhyHive({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'bg-beige-100 mt-6 rounded-3xl px-4 pt-6 sm:py-24 md:px-6 md:py-[120px]',
        className,
      )}
    >
      <Heading as="h2" size="md" className="text-balance sm:px-6 sm:text-center">
        Why Choose Hive for GraphQL Federation?
      </Heading>
      <ul className="flex flex-row flex-wrap justify-center divide-y divide-solid sm:mt-6 sm:divide-x sm:divide-y-0 md:mt-16 md:px-6 xl:px-16">
        <InfoCard
          as="li"
          heading="Complete Federation Stack"
          icon={<PerformanceListItemIcon />}
          className="flex-1 text-balance px-0 sm:px-8 sm:py-0 md:px-8 md:py-0"
        >
          <div>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold">Gateway — </span> efficiently serve data from your
                federated graph.
              </li>
              <li>
                <span className="font-semibold">Schema Registry — </span> ensure consistency and
                compatibility across your federated graph.
              </li>
              <li>
                <span className="font-semibold">Observability — </span> monitor supergraph
                performance and schema usage.
              </li>
            </ul>
          </div>
        </InfoCard>
        <InfoCard
          as="li"
          heading="True Open Source"
          icon={<PerformanceListItemIcon />}
          className="flex-1 basis-full text-balance px-0 sm:basis-0 sm:px-8 sm:py-0 md:px-8 md:py-0"
        >
          <div>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold">No Vendor Lock-in — </span> Every component works
                independently with other vendors (including Apollo GraphOS).
              </li>
              <li>
                <span className="font-semibold">MIT License — </span> All components are available
                under the permissive MIT license.
              </li>
              <li>
                <span className="font-semibold">Full Control — </span> Self-host any component or
                use our cloud offering.
              </li>
            </ul>
          </div>
        </InfoCard>
        <InfoCard
          as="li"
          heading="Enterprise Tooling for GraphQL"
          icon={<PerformanceListItemIcon />}
          className="flex-1 text-balance px-0 sm:px-8 sm:py-0 md:px-8 md:py-0"
        >
          <div>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold">Single Sign-On — </span> Integrated with popular
                providers like Okta, to enable OpenID Connect login for maximum security.
              </li>
              <li>
                <span className="font-semibold">Security and Compliance — </span> Access control
                with role-based access control (RBAC), JSON Web Tokens (JWT) and Persisted
                Operations.
              </li>
              <li>
                <span className="font-semibold">Audit logs — </span>
                Keep track of all the changes made to your organization.
              </li>
            </ul>
          </div>
        </InfoCard>
      </ul>
    </section>
  );
}

function GetStarted(props: { className?: string }) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl p-12 text-center sm:p-24',
        props.className,
      )}
    >
      <Heading as="h2" size="md">
        Get Started with GraphQL Federation
      </Heading>
      <p className="relative mx-auto mt-4 max-w-[700px]">
        Begin your journey with GraphQL Federation through our <strong>step-by-step guide</strong>,
        which walks you through Apollo Federation fundamentals and helps you{' '}
        <strong>build your first gateway and subgraphs from scratch</strong>.
      </p>
      <CallToAction
        variant="primary"
        className="mx-auto mt-8"
        title="Step by step guide to Apollo Federation"
        href="/docs/get-started/apollo-federation"
      >
        Start building now
      </CallToAction>
    </section>
  );
}
