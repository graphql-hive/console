import type { MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.03.26T00-00-00.graphql-eslint.v4.ts',
  noTransaction: true,
  run: async ({ sql, connection }) => {
    const existingV3Configs = await connection.query(
      sql`SELECT resource_type, resource_id, config FROM schema_policy_config`,
    );

    await Promise.all(
      existingV3Configs.rows.map(async config => {
        const { resource_type, resource_id, config: v3Config } = config;

        if (v3Config && typeof v3Config === 'object') {
          const v4Config = migrateConfig(v3Config as any as Record<string, RuleStruct>);

          await connection.query(
            sql`UPDATE schema_policy_config SET config = ${sql.json(v4Config)} WHERE resource_type = ${resource_type} AND resource_id = ${resource_id}`,
          );
          return { resource_type, resource_id, config: v4Config };
        }

        return null;
      }),
    );
  },
} satisfies MigrationExecutor;

function migrateConfig(v3Config: Record<string, RuleStruct>): Record<string, any> {
  return Object.keys(v3Config).reduce(
    (acc, ruleName) => {
      const ruleConfig = v3Config[ruleName];

      if (Array.isArray(ruleConfig)) {
        const [severity, options] = ruleConfig;
        const newConfig = migrateRuleConfig(ruleName, options);
        const newOptions =
          newConfig.options && Object.keys(newConfig.options).length > 0 ? newConfig.options : null;

        if (options || newOptions) {
          return {
            ...acc,
            [newConfig.ruleName]: [severity, newOptions],
          };
        }

        return {
          ...acc,
          [newConfig.ruleName]: [severity],
        };
      }

      return {
        ...acc,
        [ruleName]: ruleConfig,
      };
    },
    {} as Record<string, any>,
  );
}

type RuleStruct = [0 | 1 | 2] | [0 | 1 | 2, any];

function migrateRuleConfig(ruleName: string, options: any) {
  switch (ruleName) {
    case 'alphabetize': {
      return {
        ruleName: 'alphabetize',
        options: alphabetize(options),
      };
    }
    case 'no-case-insensitive-enum-values-duplicates': {
      return {
        ruleName: 'unique-enum-value-names',
        options,
      };
    }
    default: {
      return {
        ruleName,
        options,
      };
    }
  }
}

/**
 * "alphabetize" changed "values" to a boolean instead of an array. If the array has value (can be only 1), we replace it with "true".
 * Otherwise, "false".
 */
function alphabetize(cfgSource: any) {
  const cfg = JSON.parse(JSON.stringify(cfgSource));

  if ('values' in cfg) {
    if (Array.isArray(cfg.values) && cfg.values.length >= 1) {
      cfg.values = true;
    } else {
      cfg.values = false;
    }
  }

  return cfg;
}
