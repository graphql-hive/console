import React from 'react';
import 'twin.macro';
import {
  Link,
  List,
  ListIcon,
  ListItem,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react';
import {
  VscAdd,
  VscBell,
  VscCheck,
  VscClearAll,
  VscKey,
  VscPerson,
  VscTable,
} from 'react-icons/vsc';
import { LimitSlider } from '@/components/organization/billing/LimitSlider';
import {
  BillingPlansQuery,
  BillingPlanType,
  UsageRateLimitType,
} from '@/graphql';
import { Label, Section } from '@/components/common';
import { CurrencyFormatter, NumericFormater } from './helpers';
import { Logo } from '@/components/common/Logo';

export const BillingPlanPicker: React.FC<{
  value: BillingPlanType;
  activePlan: BillingPlanType;
  plans: BillingPlansQuery['billingPlans'];
  onPlanChange: (plan: BillingPlanType) => void;
  operationsRateLimit: number;
  schemaPushesRateLimit: number;
  onOperationsRateLimitChange: (v: number) => void;
  onSchemaPushesRateLimitChange: (v: number) => void;
}> = ({
  value,
  activePlan,
  plans,
  onPlanChange,
  operationsRateLimit,
  onOperationsRateLimitChange,
  onSchemaPushesRateLimitChange,
  schemaPushesRateLimit,
}) => {
  return (
    <RadioGroup
      value={value}
      onChange={(v) => onPlanChange(v as BillingPlanType)}
      tw="mb-8"
    >
      <Stack>
        {plans.map((plan) => (
          <Radio
            colorScheme="primary"
            key={plan.id}
            name={plan.name}
            value={plan.planType}
          >
            <div tw="border-b pb-4">
              <Section.BigTitle>
                {plan.name}
                {activePlan === plan.planType ? (
                  <Label>CURRENT PLAN</Label>
                ) : null}
              </Section.BigTitle>
              <Label>
                {plan.basePrice
                  ? `STARTS AT ${CurrencyFormatter.format(
                      plan.basePrice
                    )} / MONTH + RESERVED VOLUME`
                  : plan.planType === 'ENTERPRISE'
                  ? 'Contact Us'
                  : 'FREE'}
              </Label>
              <Section.Subtitle>{plan.description}</Section.Subtitle>
              <div>
                <List spacing={2} tw="mt-2">
                  {plan.planType === BillingPlanType.Pro ? (
                    <ListItem>
                      <Section.Subtitle>
                        <ListIcon as={VscCheck} />
                        14 days free trial
                      </Section.Subtitle>
                    </ListItem>
                  ) : null}
                  <ListItem>
                    <Section.Subtitle>
                      <ListIcon as={VscCheck} />
                      {!plan.includedOperationsLimit
                        ? 'Unlimited'
                        : NumericFormater.format(plan.includedOperationsLimit)}
                      {plan.rateLimit === UsageRateLimitType.MonthlyLimited
                        ? ' '
                        : '+ '}
                      operations per month
                      {plan.pricePerOperationsUnit
                        ? ` included in base price + 
                        ${CurrencyFormatter.format(
                          plan.pricePerOperationsUnit
                        )} 
                        per 1M`
                        : null}
                    </Section.Subtitle>
                  </ListItem>
                  <ListItem>
                    <Section.Subtitle>
                      <ListIcon as={VscCheck} />
                      {!plan.includedSchemaPushLimit
                        ? 'Unlimited'
                        : NumericFormater.format(plan.includedSchemaPushLimit)}
                      {plan.rateLimit === UsageRateLimitType.MonthlyLimited
                        ? ' '
                        : '+ '}
                      schema pushes per month
                      {plan.pricePerSchemaPushUnit
                        ? ` included in base price + 
                        ${CurrencyFormatter.format(
                          plan.pricePerSchemaPushUnit
                        )} per additional schema`
                        : null}
                    </Section.Subtitle>
                  </ListItem>
                  {plan.planType === BillingPlanType.Hobby ? (
                    <>
                      <ListItem>
                        <Section.Subtitle>
                          <ListIcon as={VscCheck} />
                          GraphQL Schema Registry
                        </Section.Subtitle>
                      </ListItem>
                      <ListItem>
                        <Section.Subtitle>
                          <ListIcon as={VscPerson} />
                          Unlimited seats and collaboratos
                        </Section.Subtitle>
                      </ListItem>
                      <ListItem>
                        <Section.Subtitle>
                          <ListIcon as={VscCheck} />
                          Breaking changes checks with usage-based monitoring
                        </Section.Subtitle>
                      </ListItem>
                      <ListItem>
                        <Section.Subtitle>
                          <ListIcon as={VscBell} />
                          Alerts & Slack integration
                        </Section.Subtitle>
                      </ListItem>
                    </>
                  ) : plan.planType === BillingPlanType.Pro ? (
                    <ListItem>
                      <Section.Subtitle>
                        <ListIcon as={VscAdd} />
                        All features from Hobby, including:
                      </Section.Subtitle>
                    </ListItem>
                  ) : (
                    <ListItem>
                      <Section.Subtitle>
                        <ListIcon as={VscAdd} />
                        All features from Hobby and Pro, including:
                      </Section.Subtitle>
                    </ListItem>
                  )}
                  <ListItem>
                    <Section.Subtitle>
                      <ListIcon as={VscCheck} />
                      {plan.retentionInDays
                        ? `${plan.retentionInDays} days`
                        : 'Unlimited'}{' '}
                      retention
                    </Section.Subtitle>
                  </ListItem>
                  {plan.planType === BillingPlanType.Pro ? (
                    <>
                      <ListItem>
                        <Section.Subtitle>
                          <ListIcon as={VscTable} />
                          GraphQL Schema Policy Checks
                          <Label>COMING SOON</Label>
                        </Section.Subtitle>
                      </ListItem>
                      <ListItem>
                        <Section.Subtitle>
                          <ListIcon as={VscClearAll} />
                          GraphQL-ESLint Integration
                          <Label>COMING SOON</Label>
                        </Section.Subtitle>
                      </ListItem>
                    </>
                  ) : null}
                  {plan.planType === BillingPlanType.Enterprise ? (
                    <>
                      <ListItem>
                        <Section.Subtitle>
                          <ListIcon as={VscKey} />
                          SAML
                          <Label>COMING SOON</Label>
                        </Section.Subtitle>
                      </ListItem>
                      <ListItem>
                        <Section.Subtitle>
                          <ListIcon as={Logo} />
                          Schema design review and GraphQL support from{' '}
                          <Link href="https://the-guild.dev">The Guild</Link>
                        </Section.Subtitle>
                      </ListItem>
                    </>
                  ) : null}
                </List>
              </div>
              {value === BillingPlanType.Pro &&
              plan.planType === BillingPlanType.Pro ? (
                <div tw="pl-10 mt-4 pb-4">
                  <Section.Title>Customize your reserved volume</Section.Title>
                  <LimitSlider
                    title="Monthly GraphQL operations limit"
                    min={5}
                    step={1}
                    max={300}
                    value={operationsRateLimit}
                    marks={[
                      {
                        value: 5,
                        label: '5M (included)',
                      },
                      {
                        value: 100,
                        label: '100M',
                      },
                      {
                        value: 50,
                        label: '50M',
                      },
                    ]}
                    onChange={(v) => onOperationsRateLimitChange(v)}
                  />
                  <LimitSlider
                    title="Monthly GraphQL schema pushes"
                    min={500}
                    step={10}
                    max={1000}
                    value={schemaPushesRateLimit}
                    marks={[
                      {
                        value: 500,
                        label: '500 (included)',
                      },
                      {
                        value: 1000,
                        label: '1000',
                      },
                    ]}
                    onChange={(v) => onSchemaPushesRateLimitChange(v)}
                  />
                </div>
              ) : null}
            </div>
          </Radio>
        ))}
      </Stack>
    </RadioGroup>
  );
};
