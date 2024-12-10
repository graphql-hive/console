import Ajv from 'ajv';
import { ESLint, Linter } from 'eslint';
import { z, ZodType } from 'zod';
import { GraphQLESLintRule, parser, rules } from '@graphql-eslint/eslint-plugin';
import { RELEVANT_RULES } from './rules';

const ajv = new Ajv({
  meta: false,
  useDefaults: true,
  validateSchema: false,
  verbose: true,
  allowMatchingProperties: true,
});
const linter = new Linter();

const RULE_LEVEL = z.union([
  //
  z.number().min(0).max(2),
  z.enum(['off', 'warn', 'error']),
]);

type RuleMapValidationType = {
  [RuleKey in keyof typeof rules]: ZodType;
};

export function normalizeAjvSchema(
  schema: NonNullable<GraphQLESLintRule['meta']>['schema'],
): NonNullable<GraphQLESLintRule['meta']>['schema'] {
  if (Array.isArray(schema)) {
    if (schema.length === 0) {
      return [];
    }

    return {
      type: 'array',
      items: schema,
      minItems: 0,
      maxItems: schema.length,
    };
  }

  return schema;
}

export function createInputValidationSchema() {
  return z
    .object(
      RELEVANT_RULES.reduce((acc, [name, rule]) => {
        const schema = normalizeAjvSchema(rule.meta!.schema);
        const validate = schema ? ajv.compile(schema) : null;
        const cfg = z.union([
          z.tuple([RULE_LEVEL]),
          z.tuple(
            validate
              ? [
                  RULE_LEVEL,
                  z.custom(data => {
                    const asArray = (Array.isArray(data) ? data : [data]).filter(Boolean);
                    const result = validate(asArray);

                    if (result) {
                      return true;
                    }

                    throw new Error(
                      `Failed to validate rule "${name}" configuration: ${ajv.errorsText(
                        validate.errors,
                      )}`,
                    );
                  }),
                ]
              : [RULE_LEVEL],
          ),
        ]);

        return {
          ...acc,
          // v3 rules were using just a raw name, and v4 rule is using the plugin name as prefix
          // This fix should make sure both will work.
          [name]: cfg,
          [`@graphql-eslint/${name}`]: cfg,
        };
      }, {} as RuleMapValidationType),
    )
    .required()
    .partial()
    .strict('Unknown rule name passed');
}

export type PolicyConfigurationObject = z.infer<ReturnType<typeof createInputValidationSchema>>;

type NarrowPrefixKeys<T extends Record<string, any>, Prefix extends string> = {
  [K in keyof T as `${Prefix}${string & K}`]: T[K];
};

type NormalizedPolicyConfigurationObject = NarrowPrefixKeys<
  PolicyConfigurationObject,
  '@graphql-eslint/'
>;

/**
 * Transforms v3/v4 policy to v4, ensuring "@graphql-eslint" prefix is used.

 * @param inputPolicy v3/v4 policy
 * @returns v4
 */
function normalizeInputPolicy(
  inputPolicy: PolicyConfigurationObject,
): NormalizedPolicyConfigurationObject {
  return Object.keys(inputPolicy).reduce((acc, key) => {
    const normalizedKey = (
      key.startsWith('@graphql-eslint/') ? key : `@graphql-eslint/${key}`
    ) as keyof NormalizedPolicyConfigurationObject;

    acc[normalizedKey] = inputPolicy[key as keyof PolicyConfigurationObject];
    return acc;
  }, {} as NormalizedPolicyConfigurationObject);
}

export async function schemaPolicyCheck(input: {
  source: string;
  schema: string;
  policy: PolicyConfigurationObject;
}) {
  const normalizedPolicy = normalizeInputPolicy(input.policy);

  const rulesMap: Record<string, ESLint.Plugin> = {
    // "any" here is used because we have weird typing issues with v3 -> v4.
    '@graphql-eslint': { rules: rules as any },
  };

  const linterResult = linter.verify(
    input.source,
    {
      files: ['*.graphql'],
      plugins: rulesMap,
      languageOptions: {
        parser,
        parserOptions: {
          schemaSdl: input.schema,
          filePath: 'schema.graphql',
        },
      },
      rules: normalizedPolicy,
    },
    'schema.graphql',
  );

  return linterResult.map(r => {
    return {
      ...r,
      // v4 returns is a bit different from v3, so we need to handle it differently to keep the responses the same.
      ruleId: r.ruleId?.replace('@graphql-eslint/', ''),
    };
  });
}
