import { ReactElement } from 'react';
import type { JSONSchema } from 'json-schema-typed';
import { InfoIcon } from 'lucide-react';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Popover } from '@/components/base/floating/popover/popover';
import { Markdown } from '@/components/v2/markdown';
import { FragmentType, graphql, useFragment } from '@/gql';
import { RuleInstanceSeverityLevel } from '@/gql/graphql';
import { DocsLink } from '../ui/docs-note';
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
  disabled?: boolean;
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
    <>
      <div className="px-1 py-4" data-rule={ruleInfo.id}>
        <div className="flex gap-x-4">
          <div className="pt-[2px]">
            <Checkbox
              id={ruleInfo.id}
              value={ruleInfo.id}
              checked={enabled}
              disabled={props.disabled}
              onCheckedChange={newState => toggleRuleState(newState as boolean)}
            />
          </div>
          <div className="w-full">
            <div className="mb-2">
              <label htmlFor={ruleInfo.id} className="font-mono text-sm font-medium">
                {ruleInfo.id}
                <Popover
                  trigger={
                    <button
                      type="button"
                      aria-label="About this rule"
                      className="text-accent ml-2 inline-block align-middle"
                    >
                      <InfoIcon className="size-4" />
                    </button>
                  }
                  openOnHover
                  side="top"
                  align="start"
                  width="xl"
                  content={
                    <div className="text-fg-default">
                      <Markdown content={ruleInfo.description} className="text-sm" />
                      <br />
                      {ruleInfo.documentationUrl ? (
                        <DocsLink href={ruleInfo.documentationUrl} text="read more" />
                      ) : null}
                    </div>
                  }
                />
              </label>
            </div>
            {enabled ? (
              <div className="flex w-full">
                <div>
                  <SeverityLevelToggle canTurnOff={props.overridingParentRule} rule={ruleInfo.id} />
                </div>
                <div className="[&>*]:border-l-line grid grow grid-cols-4 align-middle [&>*]:min-h-[40px] [&>*]:border-l-[1px]">
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
              <div className="text-fg-secondary mt-4 text-xs font-medium">
                <p className="text-accent mr-2 inline-block text-sm font-medium">!</p>
                You are {severity === RuleInstanceSeverityLevel.Off ? 'disabling' : 'overriding'} a
                rule configured at the organization level
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
