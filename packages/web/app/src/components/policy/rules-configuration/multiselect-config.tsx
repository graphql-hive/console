import { ReactElement, useEffect } from 'react';
import { InfoIcon } from 'lucide-react';
import { Tooltip } from '@/components/v2';
import { Combobox } from '@/components/v2/combobox';
import { useConfigurationHelper } from '../form-helper';
import { PolicyConfigBox } from '../policy-config-box';

export const PolicyMultiSelect = (props: {
  rule: string;
  propertyName: string;
  defaultValues: string[];
  title: string;
  tooltip?: ReactElement;
  options: {
    value: string;
    label: string;
  }[];
  creatable?: boolean;
}): ReactElement => {
  const { config, setConfig, getConfigValue } = useConfigurationHelper().ruleConfig(props.rule);
  const currentValues = getConfigValue<string[]>(props.propertyName);

  useEffect(() => {
    if (!config && typeof props.defaultValues !== 'undefined') {
      setConfig(props.propertyName, props.defaultValues);
    }
  }, []);

  return (
    <PolicyConfigBox
      title={
        <div className="flex items-center">
          <div>{props.title}</div>
          {props.tooltip ? (
            <Tooltip content={props.tooltip}>
              <InfoIcon className="ml-2 size-4 text-orange-500" />
            </Tooltip>
          ) : null}
        </div>
      }
    >
      <Combobox
        name="options"
        placeholder="Select Options"
        className="w-full"
        onBlur={() => {}}
        onChange={newValue => {
          setConfig(
            props.propertyName,
            newValue.map(o => o.value),
          );
        }}
        creatable={props.creatable}
        options={props.options || []}
        value={(currentValues ?? []).map(v => ({
          value: v,
          label: v,
        }))}
      />
    </PolicyConfigBox>
  );
};
