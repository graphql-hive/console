import { ReactElement, useEffect } from 'react';
import { InfoIcon } from 'lucide-react';
import { Popover } from '@/components/base/floating/popover/popover';
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
      <Combobox
        name="options"
        inputId={`${props.rule}_${props.propertyName}`}
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
