import { useQuery } from 'urql';
import { PageLead } from '@/components/base/page-lead';
import { graphql } from '@/gql';
import { Link } from '@tanstack/react-router';

const TargetAlertsRulesPage_Query = graphql(`
  query TargetAlertsRulesPage_Query(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      id
      metricAlertRules {
        id
        name
        type
        severity
        state
        enabled
      }
    }
  }
`);

export function TargetAlertsRulesPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = props;

  const [result] = useQuery({
    query: TargetAlertsRulesPage_Query,
    variables: { organizationSlug, projectSlug, targetSlug },
  });

  const rules = result.data?.target?.metricAlertRules ?? [];

  return (
    <>
      <PageLead
        description="The following alerts are currently active for this target."
        title="Configured alerts"
      />

      {result.fetching && rules.length === 0 ? (
        <p className="text-neutral-10 text-sm">Loading…</p>
      ) : rules.length === 0 ? (
        <p className="text-neutral-10 text-sm">No alerts configured yet.</p>
      ) : (
        <ul className="divide-neutral-5 border-neutral-5 divide-y rounded-md border">
          {rules.map(rule => (
            <li key={rule.id}>
              <Link
                to="/$organizationSlug/$projectSlug/$targetSlug/alerts/$ruleId"
                params={{ organizationSlug, projectSlug, targetSlug, ruleId: rule.id }}
                className="hover:bg-neutral-3 flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <div className="text-neutral-12 text-sm font-medium">{rule.name}</div>
                  <div className="text-neutral-10 mt-0.5 text-xs">
                    {rule.type} · {rule.severity} · {rule.state}
                    {rule.enabled ? '' : ' · disabled'}
                  </div>
                </div>
                <span className="text-neutral-10 text-xs">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
