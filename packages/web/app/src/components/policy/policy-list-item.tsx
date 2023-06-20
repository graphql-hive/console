import { ReactElement } from 'react';
import type { JSONSchema } from 'json-schema-typed';
import { Checkbox } from '@/components/ui/checkbox';
import { Markdown } from '@/components/v2/markdown';
import { FragmentType, graphql, useFragment } from '@/gql';
import { RuleInstanceSeverityLevel } from '@/graphql';
import { DocsLink, Tooltip } from '../v2';
import { useConfigurationHelper } from './form-helper';
import { PolicyRuleConfig } from './rules-configuration';
import { SeverityLevelToggle } from './rules-configuration/severity-toggle';

const PolicyListItem_RuleInfoFragment = graphql(`
  fragment PolicyListItem_RuleInfoFragment on SchemaPolicyRule {
    id
    description
    recommended
    documentationUrl
    configJsonSchema
  }
`);

function extractBaseSchema(configJsonSchema: JSONSchema | null | undefined): JSONSchema | null {
  if (
    configJsonSchema &&
    typeof configJsonSchema === 'object' &&
    configJsonSchema.type === 'array' &&
    typeof configJsonSchema.items === 'object' &&
    configJsonSchema.items.type === 'object'
  ) {
    return configJsonSchema.items;
  }

  return null;
}

export function PolicyListItem(props: {
  ruleInfo: FragmentType<typeof PolicyListItem_RuleInfoFragment>;
  overridingParentRule: boolean;
}): ReactElement {
  const config = useConfigurationHelper();
  const ruleInfo = useFragment(PolicyListItem_RuleInfoFragment, props.ruleInfo);
  const { enabled, toggleRuleState, severity } = config.ruleConfig(ruleInfo.id);
  const shouldShowRuleConfig =
    !props.overridingParentRule ||
    (props.overridingParentRule && severity !== RuleInstanceSeverityLevel.Off);

  return (
    <Tooltip.Provider delayDuration={100}>
      <div className="py-4 px-1">
        <div className="flex gap-4">
          <div>
            <Checkbox
              id={ruleInfo.id}
              value={ruleInfo.id}
              checked={enabled}
              onCheckedChange={newState => toggleRuleState(newState as boolean)}
            />
          </div>
          <div className="w-full">
            <div className="mb-2">
              <Tooltip
                contentProps={{
                  className: 'block max-w-[500px]',
                  side: 'top',
                  align: 'start',
                }}
                content={
                  <>
                    <Markdown content={ruleInfo.description} className="text-sm" />
                    <br />
                    {ruleInfo.documentationUrl ? (
                      <DocsLink href={ruleInfo.documentationUrl}>read more</DocsLink>
                    ) : null}
                  </>
                }
              >
                <label htmlFor={ruleInfo.id} className="font-mono text-sm font-medium">
                  {ruleInfo.id}
                </label>
              </Tooltip>
            </div>
            {enabled ? (
              <div className="flex w-full">
                <div>
                  <SeverityLevelToggle canTurnOff={props.overridingParentRule} rule={ruleInfo.id} />
                </div>
                <div className="grow grid grid-cols-4 [&>*]:border-l-gray-800 [&>*]:border-l-[1px] align-middle [&>*]:min-h-[40px]">
                  {shouldShowRuleConfig && (
                    <PolicyRuleConfig
                      rule={ruleInfo.id}
                      configJsonSchema={extractBaseSchema(ruleInfo.configJsonSchema)}
                      baseDocumentationUrl={ruleInfo.documentationUrl ?? undefined}
                    />
                  )}
                </div>
              </div>
            ) : null}
            {props.overridingParentRule && enabled ? (
              <div className="text-xs font-medium mt-4 text-gray-400">
                <p className="text-orange-500 text-sm font-medium inline-block mr-2">!</p>
                You are {severity === RuleInstanceSeverityLevel.Off ? 'disabling' : 'overriding'} a
                rule configured at the organization level
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
