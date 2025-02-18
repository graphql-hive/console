'use client';

import { use } from 'react';
import { cn, ComparisonTable as Table } from '@theguild/components';
import { functionalTones } from './functional-tones';
import { CheckmarkIcon, XIcon } from './icons';

interface BenchmarkDatum {
  name: string;
  cases: {
    passed: number;
    failed: number;
  };
  suites: {
    passed: number;
    failed: number;
  };
}

const dataJson = fetch(
  'https://the-guild.dev/graphql/hive/federation-gateway-audit/data.json',
).then(
  res =>
    // we didn't parse this, because we trust @kamilkisiela
    res.json() as Promise<BenchmarkDatum[]>,
);

export function BenchmarkTableBody() {
  // we're fetching in client component to get fresh data without redeploy
  // if we don't need it THAT fresh, feel free to just await it in the parent component
  const data = use(dataJson);

  return (
    <tbody className="">
      {data.map(row => {
        const compatibility = (row.cases.passed / (row.cases.passed + row.cases.failed)) * 100;

        return (
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
                      compatibility > 99
                        ? functionalTones.positiveBright
                        : compatibility > 90
                          ? functionalTones.warning
                          : functionalTones.criticalBright,
                  }}
                />
                {row.name}
              </div>
            </Table.Cell>
            <Table.Cell className="text-sm text-green-800">{compatibility.toFixed(2)}%</Table.Cell>
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
        );
      })}
    </tbody>
  );
}
