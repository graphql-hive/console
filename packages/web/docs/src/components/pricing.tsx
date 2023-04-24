import { ReactElement, ReactNode } from 'react';
import { Arrow, Content, Root, Trigger } from '@radix-ui/react-tooltip';

function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <Root>
      <Trigger>{children}</Trigger>
      <Content
        sideOffset={5}
        className="rounded-sm bg-white p-2 text-xs font-normal text-black shadow"
      >
        {content}
        <Arrow className="fill-current text-white" />
      </Content>
    </Root>
  );
}

function Plan(plan: {
  name: string;
  description: string;
  price: ReactNode | string;
  features: (ReactNode | string)[];
  footer?: ReactNode;
}): ReactElement {
  return (
    <div className="flex w-full flex-col items-start rounded-md border border-gray-700 p-4 hover:border-gray-600 md:w-1/3">
      <div className="flex h-full flex-col justify-between">
        <div>
          <h2 className="flex items-center justify-between text-base font-bold text-white">
            {plan.name}
          </h2>
          <div className="text-3xl font-bold text-white">{plan.price}</div>
          <div className="mt-3 text-sm text-gray-500">{plan.description}</div>
          <div>
            <ul className="mt-6 list-disc px-5 text-gray-500">
              {plan.features.map((feature, i) => (
                <li key={i} className="mb-2 box-border">
                  <div className="flex items-center text-sm text-gray-300">{feature}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {plan.footer && (
          <div>
            <div className="mx-auto my-4 w-9/12 border-b border-gray-800" />
            <div className="text-xs text-gray-300">{plan.footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const USAGE_DATA_RETENTION_EXPLAINER =
  'How long to store GraphQL requests reported to GraphQL Hive';
const OPERATIONS_EXPLAINER = 'GraphQL requests reported to GraphQL Hive';

export function Pricing({ gradient }: { gradient: [string, string] }): ReactElement {
  return (
    <div className="w-full bg-neutral-900">
      <div className="mx-auto my-12 box-border w-full max-w-[1024px] px-6">
        <h2
          className="bg-clip-text text-2xl font-bold leading-normal text-transparent md:text-3xl"
          style={{
            backgroundImage: `linear-gradient(-70deg, ${gradient[1]}, ${gradient[0]})`,
          }}
        >
          Pricing
        </h2>
        <p className="text-gray-400">All features are available in every plan</p>
        <div className="mt-6 flex flex-col content-start items-stretch justify-start justify-items-start gap-4 md:flex-row">
          <Plan
            name="Hobby"
            description="For personal or small projects"
            price="Free"
            features={[
              'Unlimited seats',
              'Unlimited schema pushes',
              <Tooltip content={OPERATIONS_EXPLAINER}>Limit of 1M operations monthly</Tooltip>,
              <Tooltip content={USAGE_DATA_RETENTION_EXPLAINER}>
                7 days of usage data retention
              </Tooltip>,
            ]}
          />
          <Plan
            name="Pro"
            description="For scaling API"
            price={
              <Tooltip content="Base price charged monthly">
                $10<span className="text-sm text-gray-500">/mo</span>
              </Tooltip>
            }
            features={[
              'Unlimited seats',
              'Unlimited schema pushes',
              <Tooltip content={OPERATIONS_EXPLAINER}>$10 per 1M operations monthly</Tooltip>,
              <Tooltip content={USAGE_DATA_RETENTION_EXPLAINER}>
                90 days of usage data retention
              </Tooltip>,
            ]}
            footer={<div className="mb-2 text-sm font-bold">Free 30 days trial period</div>}
          />
          <Plan
            name="Enterprise"
            description="Custom plan for large companies"
            price={
              <span
                className="cursor-pointer"
                onClick={() => {
                  (window as any).$crisp?.push(['do', 'chat:open']);
                }}
              >
                Contact us
              </span>
            }
            features={[
              'Unlimited seats',
              'Unlimited schema pushes',
              <Tooltip content={OPERATIONS_EXPLAINER}>Custom limit of operations</Tooltip>,
              <Tooltip content={USAGE_DATA_RETENTION_EXPLAINER}>
                12 months of usage data retention
              </Tooltip>,
              <span className="flex gap-1">
                Support from
                <a
                  href="https://the-guild.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-orange-500 transition-colors hover:underline"
                >
                  The Guild
                </a>
              </span>,
            ]}
            footer="Shape a custom plan for your business"
          />
        </div>
      </div>
    </div>
  );
}
