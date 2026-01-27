import { ReactElement, useEffect } from 'react';
import clsx from 'clsx';
import { InfoIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem, Tooltip } from '../../v2';
import { useConfigurationHelper } from '../form-helper';
import { PolicyConfigBox } from '../policy-config-box';

export const PolicyEnumSelect = (props: {
  rule: string;
  propertyName: string;
  defaultValue: string;
  title: string;
  tooltip?: ReactElement;
  options: {
    value: string;
    label: string;
  }[];
}): ReactElement => {
  const { config, setConfig, getConfigValue } = useConfigurationHelper().ruleConfig(props.rule);
  const currentValue = getConfigValue<string>(props.propertyName);

  useEffect(() => {
    if (!config) {
      setConfig(props.propertyName, props.defaultValue);
    }
  }, []);

  return (
    <PolicyConfigBox
      title={
        <div className="flex items-center">
          <div>{props.title}</div>
          {props.tooltip ? (
            <Tooltip content={props.tooltip}>
              <InfoIcon className="text-accent ml-2 size-4" />
            </Tooltip>
          ) : null}
        </div>
      }
    >
      <ToggleGroup
        defaultValue="list"
        onValueChange={newValue => {
          if (newValue) {
            setConfig(props.propertyName, newValue);
          }
        }}
        value={currentValue}
        type="single"
        className="text-neutral-10 bg-gray-900/50"
      >
        {props.options.map(option => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            title={option.label}
            className={clsx(
              'hover:text-neutral-12 text-xs',
              currentValue === option.value && 'bg-neutral-5 text-neutral-12',
            )}
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </PolicyConfigBox>
  );
};
