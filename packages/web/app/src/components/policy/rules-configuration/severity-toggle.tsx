import { ReactElement } from 'react';
import clsx from 'clsx';
import { ToggleGroup } from '@/components/base/toggle-group/toggle-group';
import { RuleInstanceSeverityLevel } from '@/gql/graphql';
import { CrossCircledIcon, ExclamationTriangleIcon, MinusCircledIcon } from '@radix-ui/react-icons';
import { useConfigurationHelper } from '../form-helper';
import { PolicyConfigBox } from '../policy-config-box';

export const SeverityLevelToggle = (props: { rule: string; canTurnOff: boolean }): ReactElement => {
  const config = useConfigurationHelper().ruleConfig(props.rule);
  const options = [
    {
      value: RuleInstanceSeverityLevel.Warning,
      label: 'Warning',
      icon: (active: boolean) => (
        <ExclamationTriangleIcon
          className={clsx(active ? 'text-orange-500' : 'text-neutral-8', 'hover:text-orange-500')}
        />
      ),
    },
    {
      value: RuleInstanceSeverityLevel.Error,
      label: 'Error',
      icon: (active: boolean) => (
        <CrossCircledIcon
          className={clsx(active ? 'text-red-600' : 'text-neutral-8', 'hover:text-red-600')}
        />
      ),
    },
  ];

  if (props.canTurnOff) {
    options.unshift({
      value: RuleInstanceSeverityLevel.Off,
      label: 'Disables a rule defined at the organization level',
      icon: (active: boolean) => (
        <MinusCircledIcon
          className={clsx(active ? 'text-neutral-12' : 'text-neutral-8', 'hover:text-neutral-12')}
        />
      ),
    });
  }

  return (
    <PolicyConfigBox title="severity" className="row-start-1 row-end-6 first:pl-0">
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
