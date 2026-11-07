import { ReactElement } from 'react';
import type { JSONSchema } from 'json-schema-typed';
import { InfoIcon } from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';
import { Checkbox } from '@/components/ui/primitives/checkbox/checkbox';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { FragmentType, graphql, useFragment } from '@/gql';
import { RuleInstanceSeverityLevel } from '@/gql/graphql';
import * as shared from '@/styles/shared.css';
import { DocsLink } from '../ui/docs-note';
import { useConfigurationHelper } from './form-helper';
import { PolicyRuleConfig } from './rules-configuration';
import { SeverityLevelToggle } from './rules-configuration/severity-toggle';
import { policyListItemStyles } from './policy-list-item.css';

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
      <div className={policyListItemStyles.root} data-rule={ruleInfo.id}>
        <div className={policyListItemStyles.row}>
          <div className={policyListItemStyles.checkbox}>
            <Checkbox
              id={ruleInfo.id}
              value={ruleInfo.id}
              checked={enabled}
              disabled={props.disabled}
              onCheckedChange={newState => toggleRuleState(newState as boolean)}
            />
          </div>
          <div className={shared.fullWidth}>
            <div className={policyListItemStyles.header}>
              <label htmlFor={ruleInfo.id} className={policyListItemStyles.label}>
                {ruleInfo.id}
                <Popover
                  trigger={
                    <button
                      type="button"
                      aria-label="About this rule"
                      className={policyListItemStyles.hint}
                    >
                      <InfoIcon className={policyListItemStyles.hintIcon} />
                    </button>
                  }
                  openOnHover
                  side="top"
                  align="start"
                  width="xl"
                  content={
                    <div className={shared.fg.default}>
                      <Markdown
                        content={ruleInfo.description}
                        className={policyListItemStyles.hintMarkdown}
                      />
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
              <div className={policyListItemStyles.settings}>
                <div>
                  <SeverityLevelToggle canTurnOff={props.overridingParentRule} rule={ruleInfo.id} />
                </div>
                <div className={policyListItemStyles.config}>
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
              <div className={policyListItemStyles.override}>
                <p className={policyListItemStyles.overrideMark}>!</p>
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
