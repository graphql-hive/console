import { ReactElement, useEffect } from 'react';
import { InfoIcon } from 'lucide-react';
import { Popover } from '@/components/base/floating/popover/popover';
import { Input } from '@/components/base/input/input';
import { useConfigurationHelper } from '../form-helper';
import { PolicyConfigBox } from '../policy-config-box';

export const PolicyStringInputConfig = (props: {
  rule: string;
  title: string;
  propertyName: string;
  defaultValue: string;
  tooltip?: ReactElement;
}): ReactElement => {
  const { config, setConfig, getConfigValue } = useConfigurationHelper().ruleConfig(props.rule);
  const currentValue = getConfigValue<string | undefined>(props.propertyName);

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
      <Input
        size="compact"
        id={`${props.rule}_${props.propertyName}`}
        value={currentValue || ''}
        onChange={e => setConfig(props.propertyName, e.target.value)}
      />
    </PolicyConfigBox>
  );
};
