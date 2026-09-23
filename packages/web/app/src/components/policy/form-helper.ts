import { useFormContext, useWatch } from 'react-hook-form';
import { RuleInstanceSeverityLevel } from '@/gql/graphql';
import type { PolicyFormValues } from './rules-configuration';

/** A rule's config is untyped, so paths into it are built by hand. */
function configPath(id: string, property: string) {
  const path: string = `rules.${id}.config${property === '' ? '' : `.${property}`}`;
  return path as `rules.${string}.config`;
}

const write = { shouldDirty: true, shouldValidate: true } as const;

export function useConfigurationHelper() {
  const form = useFormContext<PolicyFormValues>();
  const rules = useWatch({ control: form.control, name: 'rules' });

  return {
    ruleConfig(id: string) {
      const rule = rules?.[id];

      return {
        enabled: rule?.enabled ?? false,
        severity: rule?.severity,
        config: rule?.config,
        setConfig(property: string, value: unknown) {
          const empty = Array.isArray(value) && value.length === 0;
          form.setValue(configPath(id, property), empty ? undefined : value, write);
        },
        setConfigAsInvalid(property: string, message: string) {
          form.setError(configPath(id, property), { type: 'manual', message });
        },
        getConfigValue<T>(property: string): T | undefined {
          const levels = property.split('.');
          let propName: string | undefined;
          let obj = rule?.config;

          do {
            propName = levels.shift();

            if (propName) {
              obj = obj && typeof obj === 'object' ? (obj as any)[propName] : undefined;
            }
          } while (propName && obj);

          return obj as any as T;
        },
        setSeverity(severity: RuleInstanceSeverityLevel) {
          form.setValue(`rules.${id}.severity`, severity, write);
        },
        toggleRuleState(enabled: boolean) {
          form.setValue(
            `rules.${id}`,
            {
              enabled,
              severity: rule?.severity ?? RuleInstanceSeverityLevel.Warning,
              config: rule?.config,
            },
            write,
          );
        },
        getValidationStatus(property: string) {
          const message = form.getFieldState(configPath(id, property), form.formState).error
            ?.message;

          return message
            ? {
                status: 'error' as const,
                message,
              }
            : {
                status: 'success' as const,
                message: null,
              };
        },
      };
    },
  };
}
