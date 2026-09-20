import { ReactElement, useEffect } from 'react';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { useConfigurationHelper } from '../form-helper';
import { PolicyConfigBox } from '../policy-config-box';

export const PolicyBooleanToggle = (props: {
  rule: string;
  title: string;
  propertyName: string;
  defaultValue: boolean;
  tooltip?: ReactElement;
}): ReactElement => {
  const { config, setConfig, getConfigValue } = useConfigurationHelper().ruleConfig(props.rule);
  const currentValue = getConfigValue<boolean>(props.propertyName);

  useEffect(() => {
    if (!config) {
      setConfig(props.propertyName, props.defaultValue);
    }
  }, []);

  const label = (
    <label
      className="text-neutral-10 pb-1 pl-2 font-mono text-xs"
      htmlFor={`${props.rule}_${props.propertyName}`}
    >
      {props.title}
    </label>
  );

  return (
    <PolicyConfigBox>
      <div>
        <Checkbox
          id={`${props.rule}_${props.propertyName}`}
          value={props.rule}
          checked={currentValue ?? props.defaultValue}
          onCheckedChange={newValue => setConfig(props.propertyName, newValue)}
        />
      </div>
      <div className="grow">
        {props.tooltip ? <Tooltip trigger={label} content={props.tooltip} /> : label}
      </div>
    </PolicyConfigBox>
  );
};
