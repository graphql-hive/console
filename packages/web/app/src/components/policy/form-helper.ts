import { useFormikContext } from 'formik';
import { RuleInstanceSeverityLevel } from '@/graphql';
import type { PolicyFormValues } from './rules-configuration';

export function useConfigurationHelper() {
  const formik = useFormikContext<PolicyFormValues>();

  return {
    ruleConfig(id: string) {
      return {
        enabled: formik.values.rules[id]?.enabled ?? false,
        severity: formik.values.rules[id]?.severity,
        config: formik.values.rules[id]?.config,
        getConfigAsString() {
          return JSON.stringify(formik.values.rules[id]?.config, null, 2);
        },
        setConfig(property: string, value: any) {
          const actualProp = property === '' ? '' : `.${property}`;

          if (value && Array.isArray(value) && value.length === 0) {
            formik.setFieldValue(`rules.${id}.config${actualProp}`, undefined, true);
          } else {
            formik.setFieldValue(`rules.${id}.config${actualProp}`, value, true);
          }
        },
        getConfigValue<T>(property: string): T | undefined {
          const levels = property.split('.');
          let propName: string | undefined;
          let obj = formik.values.rules[id]?.config;

          do {
            propName = levels.shift();

            if (propName) {
              obj = obj && typeof obj === 'object' ? (obj as any)[propName] : undefined;
            }
          } while (propName && obj);

          return obj as any as T;
        },
        setSeverity(severity: RuleInstanceSeverityLevel) {
          formik.setFieldValue(`rules.${id}.severity`, severity, true);
        },
        toggleRuleState(newValue: boolean) {
          formik.setFieldValue(`rules.${id}.enabled`, newValue, true);

          if (newValue && !formik.values.rules[id]?.severity) {
            formik.setFieldValue(`rules.${id}.severity`, RuleInstanceSeverityLevel.Warning, true);
          }
        },
      };
    },
  };
}
