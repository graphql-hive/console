import { Suspense } from 'react';
import { CallToAction, cn, Heading, ComparisonTable as Table } from '@theguild/components';
import { BenchmarkTableBody } from './benchmark-table-body';
import { functionalTones } from './functional-tones';
import { CheckmarkIcon, XIcon } from './icons';

export interface FederationCompatibleBenchmarksSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function FederationCompatibleBenchmarksSection({
  className,
  ...rest
}: FederationCompatibleBenchmarksSectionProps) {
  return (
    <section
      className={cn(
        'text-green-1000 px-4 py-6 sm:py-12 md:px-6 lg:py-[120px] xl:px-[120px]',
        className,
      )}
      {...rest}
    >
      <header className="md:text-balance md:text-center">
        <Heading as="h1" size="lg">
          Federation-Compatible Gateway Benchmarks
        </Heading>
        <p className="mb-6 mt-4 text-green-800 md:mb-16">
          See the results of our open-source audit for Apollo Federation Gateways.
        </p>
      </header>
      <div className="my-6 flex items-start gap-6 max-md:flex-col md:mb-12 md:mt-16">
        <p className="text-pretty text-2xl/8 lg:text-[32px]/10">
          Learn how Hive Gateway performs against other gateways in&nbsp;terms of correctness and
          compliance with the Apollo Federation specification
        </p>
        <CallToAction
          variant="tertiary"
          href="https://the-guild.dev/graphql/hive/federation-gateway-audit"
        >
          Learn about our audit and methodology
        </CallToAction>
      </div>
      <div className="hive-focus nextra-scrollbar border-beige-400 [&_:is(td,th)]:border-beige-400 overflow-x-auto rounded-2xl border [scrollbar-width:auto] max-sm:-mx-8">
        <Table className="table w-full border-none max-sm:rounded-none max-sm:text-sm">
          <thead>
            <Table.Row className="*:text-left">
              <Table.Header className="whitespace-pre pl-6">
                Gateway
                <small className="block text-xs/[18px] text-green-800">Name and variant</small>
              </Table.Header>
              <Table.Header className="whitespace-pre sm:w-1/4">
                Compatibility
                <small className="block text-xs/[18px] text-green-800">
                  Pass rate of test cases
                </small>
              </Table.Header>
              <Table.Header className="whitespace-pre sm:w-1/4">
                Test Cases
                <small className="block text-xs/[18px] text-green-800">
                  All available test cases
                </small>
              </Table.Header>
              <Table.Header className="whitespace-pre sm:w-1/4">
                Test Suites
                <small className="block text-xs/[18px] text-green-800">
                  Test cases grouped by feature
                </small>
              </Table.Header>
            </Table.Row>
          </thead>
          <Suspense
            fallback={
              <tbody aria-busy>
                <tr>
                  <td colSpan={4} className="bg-beige-100 h-[347.5px] animate-pulse cursor-wait" />
                </tr>
              </tbody>
            }
          >
            <BenchmarkTableBody />
          </Suspense>
        </Table>
      </div>
      <BenchmarkLegend />
    </section>
  );
}

function BenchmarkLegend() {
  return (
    <div className="mt-6 flex flex-wrap gap-2 whitespace-nowrap text-xs text-green-800 sm:gap-4">
      <div className="flex gap-2 max-sm:-mx-1 max-sm:w-full sm:contents">
        <div className="flex items-center gap-1">
          <CheckmarkIcon className="size-4" style={{ color: functionalTones.positiveDark }} />{' '}
          Passed tests
        </div>
        <div className="flex items-center gap-1">
          <XIcon className="size-4" style={{ color: functionalTones.criticalDark }} /> Failed tests
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="size-2 rounded-full"
          style={{ background: functionalTones.positiveBright }}
        />
        Perfect compatibility
      </div>
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full" style={{ background: functionalTones.warning }} />
        75% and higher
      </div>
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full" style={{ background: functionalTones.criticalDark }} />
        Less than 75%
      </div>
    </div>
  );
}
