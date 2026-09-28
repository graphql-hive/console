import { ReactElement, useEffect } from 'react';
import { InfoIcon } from 'lucide-react';
import { Popover } from '@/components/base/floating/popover/popover';
import { ToggleGroup } from '@/components/base/toggle-group/toggle-group';
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
            <Popover
              trigger={
                <button type="button" aria-label="About this option" className="text-accent ml-2">
                  <InfoIcon className="size-4" />
                </button>
              }
              openOnHover
              content={<p className="text-fg-default text-sm">{props.tooltip}</p>}
            />
          ) : null}
        </div>
      }
    >
      <ToggleGroup
        options={props.options}
        value={currentValue}
        onValueChange={newValue => {
          setConfig(props.propertyName, newValue);
        }}
        aria-label={props.title}
      />
    </PolicyConfigBox>
  );
};
