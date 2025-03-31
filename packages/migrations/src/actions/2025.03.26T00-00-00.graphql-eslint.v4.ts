import { z } from 'zod';
import { type MigrationExecutor } from '../pg-migrator';

const ESLintRuleSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const RuleStructSchema = z.union([
  z.tuple([ESLintRuleSchema]),
  z.tuple([ESLintRuleSchema, z.any()]),
]);
const V3ConfigSchema = z.record(z.string(), RuleStructSchema);

const QUERY_RESULT = z.array(
  z.object({
    resourceType: z.string(),
    resourceId: z.string(),
    jsonConfig: V3ConfigSchema,
  }),
);

type RuleStruct = z.infer<typeof RuleStructSchema>;
type V3Config = z.infer<typeof V3ConfigSchema>;
type V4Config = z.infer<typeof V3ConfigSchema>; // same really here, just for semantics

export default {
  name: '2025.03.26T00-00-00.graphql-eslint.v4.ts',
  noTransaction: true,
  run: async ({ sql, connection }) => {
    console.log('Preparing policy config table with a new column (config_v4)...');
    await connection.query(
      sql`ALTER TABLE
            schema_policy_config
          ADD COLUMN IF NOT EXISTS "config_v4" jsonb`,
    );

    console.log('Looking for existing schema_policy_config objects...');

    const existingV3Configs = await connection.query(
      sql`
        SELECT
          resource_type as "resourceType",
          resource_id as "resourceId",
          config as "jsonConfig"
        FROM schema_policy_config`,
    );

    if (existingV3Configs.rowCount === 0) {
      console.log('No records found for schema_policy_config.');
      return;
    }

    const rows = QUERY_RESULT.parse(existingV3Configs.rows);

    for (const config of rows) {
      try {
        const { resourceType, resourceId, jsonConfig } = config;

        if (jsonConfig && typeof jsonConfig === 'object') {
          const v4Config = migrateConfig(jsonConfig);

          await connection.query(
            sql`UPDATE schema_policy_config SET config_v4 = ${sql.json(v4Config)} WHERE resource_type = ${resourceType} AND resource_id = ${resourceId}`,
          );
          console.log(`Migrated config for ${resourceType}:${resourceId}`);
        } else {
          console.log(`Invalid config for ${resourceType}:${resourceId}, skipping...`);
        }
      } catch (e) {
        console.error('Error migrating config', config, e);
      }
    }
  },
} satisfies MigrationExecutor;

function migrateConfig(v3Config: V3Config): V4Config {
  return Object.keys(v3Config).reduce((acc, ruleName) => {
    const ruleConfig = v3Config[ruleName];

    if (Array.isArray(ruleConfig)) {
      const [severity, options] = ruleConfig;
      const newConfig = migrateRuleConfig(ruleName, options);

      if (newConfig.options) {
        return {
          ...acc,
          [newConfig.ruleName]: [severity, newConfig.options],
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
  }, {} as V4Config);
}

function migrateRuleConfig(ruleName: string, options: RuleStruct) {
  switch (ruleName) {
    case 'alphabetize': {
      return {
        ruleName: 'alphabetize',
        options: alphabetize(options),
      };
    }
    // the only change here is the name of the rule.
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
function alphabetize(cfgSource: RuleStruct): RuleStruct {
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
