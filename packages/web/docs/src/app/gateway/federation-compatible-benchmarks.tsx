import { CallToAction, cn, Heading, ComparisonTable as Table } from '@theguild/components';

interface BenchmarkDatum {
  name: string;
  compatibility: number;
  cases: { passed: number; failed: number };
  suites: { passed: number; failed: number };
}

const data: BenchmarkDatum[] = [
  {
    name: 'Hive Gateway',
    compatibility: 100,
    cases: { passed: 171, failed: 0 },
    suites: { passed: 41, failed: 0 },
  },
  {
    name: 'Apollo Router',
    compatibility: 97.66,
    cases: { passed: 167, failed: 4 },
    suites: { passed: 39, failed: 2 },
  },
  {
    name: 'Apollo Gateway',
    compatibility: 97.08,
    cases: { passed: 166, failed: 5 },
    suites: { passed: 38, failed: 3 },
  },
  {
    name: 'Cosmo Router',
    compatibility: 72.51,
    cases: { passed: 124, failed: 47 },
    suites: { passed: 19, failed: 22 },
  },
  {
    name: 'Grafbase Gateway',
    compatibility: 60.23,
    cases: { passed: 103, failed: 68 },
    suites: { passed: 19, failed: 22 },
  },
];

/**
 * todo: move this to the design system as Tailwind classes
 */
const functionalTones = {
  criticalBright: '#FD3325',
  criticalDark: '#F81202',
  warning: '#FE8830',
  positiveBright: '#24D551',
  positiveDark: '#1BA13D',
};

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
          <tbody>
            {data.map(row => (
              <Table.Row key={row.name} highlight={row.name === 'Hive Gateway'}>
                <Table.Cell
                  className={cn(
                    // todo: this is a bug in Components: we diverged from design
                    row.name === 'Hive Gateway' ? '!bg-green-100' : '',
                    'pl-5', // yes, the dot cuts in to the left per design
                    'max-sm:pr-1.5',
                  )}
                >
                  <div className="flex items-center gap-2.5 whitespace-nowrap">
                    <div
                      className="size-3 rounded-full"
                      style={{
                        background:
                          row.compatibility > 99
                            ? functionalTones.positiveBright
                            : row.compatibility > 90
                              ? functionalTones.warning
                              : functionalTones.criticalBright,
                      }}
                    />
                    {row.name}
                  </div>
                </Table.Cell>
                <Table.Cell className="text-sm text-green-800">
                  {row.compatibility.toFixed(2)}%
                </Table.Cell>
                <Table.Cell>
                  <span
                    className="inline-flex items-center gap-0.5 text-sm"
                    style={{ color: functionalTones.positiveDark }}
                  >
                    <CheckmarkIcon className="size-4" /> {row.cases.passed}
                  </span>
                  {row.cases.failed > 0 && (
                    <span
                      className="ml-2 inline-flex items-center text-sm"
                      style={{ color: functionalTones.criticalDark }}
                    >
                      <XIcon className="size-4" /> {row.cases.failed}
                    </span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <span
                    className="inline-flex items-center gap-0.5 text-sm"
                    style={{ color: functionalTones.positiveDark }}
                  >
                    <CheckmarkIcon className="size-4" /> {row.suites.passed}
                  </span>
                  {row.suites.failed > 0 && (
                    <span
                      className="ml-2 inline-flex items-center text-sm"
                      style={{ color: functionalTones.criticalDark }}
                    >
                      <XIcon className="size-4" /> {row.suites.failed}
                    </span>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </tbody>
        </Table>
      </div>
      <BenchmarkLegend />
    </section>
  );
}

// these are different than CheckIcon and CloseIcon we have in the design system

function CheckmarkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M6.66668 10.1134L12.7947 3.98608L13.7373 4.92875L6.66668 11.9994L2.42401 7.75675L3.36668 6.81408L6.66668 10.1134Z" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M7.99999 7.05806L11.3 3.75806L12.2427 4.70072L8.94266 8.00072L12.2427 11.3007L11.2993 12.2434L7.99932 8.94339L4.69999 12.2434L3.75732 11.3001L7.05732 8.00006L3.75732 4.70006L4.69999 3.75872L7.99999 7.05806Z" />
    </svg>
  );
}

function BenchmarkLegend() {
  return (
    <div className="mt-6 flex flex-wrap gap-2 whitespace-nowrap text-xs text-green-800 sm:gap-4">
      <div className="flex gap-2 max-sm:-mx-1 max-sm:w-full sm:contents">
        <div className="flex items-center gap-1">
          <CheckmarkIcon className="size-4" style={{ color: functionalTones.positiveDark }} /> All
          available test cases
        </div>
        <div className="flex items-center gap-1">
          <XIcon className="size-4" style={{ color: functionalTones.criticalDark }} /> All available
          test cases
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
