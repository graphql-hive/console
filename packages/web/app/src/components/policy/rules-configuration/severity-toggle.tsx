import { ReactElement } from 'react';
import clsx from 'clsx';
import { RuleInstanceSeverityLevel } from '@/gql/graphql';
import { CrossCircledIcon, ExclamationTriangleIcon, MinusCircledIcon } from '@radix-ui/react-icons';
import { ToggleGroup, ToggleGroupItem, Tooltip } from '../../v2';
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
          className={clsx(active ? 'text-orange' : 'text-neutral-8', 'hover:text-orange')}
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
        defaultValue="list"
        onValueChange={newValue => {
          if (newValue) {
            config.setSeverity(newValue as RuleInstanceSeverityLevel);
          }
        }}
        type="single"
        className="text-neutral-10 bg-neutral-2/50"
      >
        {options.map(
          level =>
            level && (
              <ToggleGroupItem
                key={level.value}
                value={level.value}
                title={level.label}
                className={clsx(
                  'hover:text-neutral-12',
                  config.severity === level.value && 'bg-neutral-5 text-neutral-12',
                )}
              >
                <Tooltip content={level.label}>
                  {level.icon(config.severity === level.value)}
                </Tooltip>
              </ToggleGroupItem>
            ),
        )}
      </ToggleGroup>
    </PolicyConfigBox>
  );
};
