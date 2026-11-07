import { ReactElement } from 'react';
import { CircleMinus, CircleX, TriangleAlert } from 'lucide-react';
import { ToggleGroup } from '@/components/ui/primitives/toggle-group/toggle-group';
import { RuleInstanceSeverityLevel } from '@/gql/graphql';
import { useConfigurationHelper } from '../form-helper';
import { PolicyConfigBox } from '../policy-config-box';
import { severityToggleStyles } from './severity-toggle.css';

export const SeverityLevelToggle = (props: { rule: string; canTurnOff: boolean }): ReactElement => {
  const config = useConfigurationHelper().ruleConfig(props.rule);
  const options = [
    {
      value: RuleInstanceSeverityLevel.Warning,
      label: 'Warning',
      icon: (active: boolean) => (
        <TriangleAlert className={severityToggleStyles.icon({ tone: 'warning', active })} />
      ),
    },
    {
      value: RuleInstanceSeverityLevel.Error,
      label: 'Error',
      icon: (active: boolean) => (
        <CircleX className={severityToggleStyles.icon({ tone: 'critical', active })} />
      ),
    },
  ];

  if (props.canTurnOff) {
    options.unshift({
      value: RuleInstanceSeverityLevel.Off,
      label: 'Disables a rule defined at the organization level',
      icon: (active: boolean) => (
        <CircleMinus className={severityToggleStyles.icon({ tone: 'neutral', active })} />
      ),
    });
  }

  return (
    <PolicyConfigBox title="severity" className={severityToggleStyles.box}>
      <ToggleGroup
        options={options.map(level => ({
          value: level.value,
          label: level.icon(config.severity === level.value),
          tooltip: level.label,
        }))}
        value={config.severity}
        onValueChange={newValue => {
          config.setSeverity(newValue as RuleInstanceSeverityLevel);
        }}
        aria-label="Severity"
      />
    </PolicyConfigBox>
  );
};
