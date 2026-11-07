import { ReactElement, useEffect } from 'react';
import { InfoIcon } from 'lucide-react';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { ToggleGroup } from '@/components/ui/primitives/toggle-group/toggle-group';
import * as shared from '@/styles/shared.css';
import { useConfigurationHelper } from '../form-helper';
import { PolicyConfigBox } from '../policy-config-box';
import { enumConfigStyles } from './enum-config.css';

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
        <div className={shared.row.base}>
          <div>{props.title}</div>
          {props.tooltip ? (
            <Popover
              trigger={
                <button
                  type="button"
                  aria-label="About this option"
                  className={enumConfigStyles.hint}
                >
                  <InfoIcon className={enumConfigStyles.hintIcon} />
                </button>
              }
              openOnHover
              content={<p className={enumConfigStyles.hintText}>{props.tooltip}</p>}
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
