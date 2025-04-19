import { ProjectType, RuleInstanceSeverityLevel, SchemaPolicyInput } from 'testkit/gql/graphql';
import { prepareProject } from 'testkit/registry-models';
import { GraphQLESLintRule, rules } from '@graphql-eslint/eslint-plugin';
import { createCLI } from '../../../testkit/cli';

type Unpacked<T> = T extends (infer U)[] ? U : T;
type ESLintLikeConfig = {
  [Property in keyof typeof rules]?:
    | [0 | 1 | 2]
    | [
        0 | 1 | 2,
        (typeof rules)[Property] extends GraphQLESLintRule<infer T, infer U> ? Unpacked<T> : never,
      ];
};

const createPolicyFromESLint = (eslintConfig: ESLintLikeConfig): SchemaPolicyInput => {
  const rules = Object.entries(eslintConfig).map(([ruleId, [severity, options]]) => ({
    ruleId,
    severity:
      severity === 0
        ? RuleInstanceSeverityLevel.Off
        : severity === 1
          ? RuleInstanceSeverityLevel.Warning
          : RuleInstanceSeverityLevel.Error,
    configuration: options,
  }));

  return {
    rules,
  };
};

describe('v3 -> v4 config migration', () => {
  const samples: ESLintLikeConfig[] = [
    {
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'require-description': [1, { EnumTypeDefinition: true }],
      'require-type-pattern-with-oneof': [1],
    },
    {},
    {
      'input-name': [
        1,
        {
          checkQueries: true,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      alphabetize: [
        1,
        {
          fields: ['ObjectTypeDefinition'],
          values: true,
          arguments: ['FieldDefinition'],
          definitions: true,
        },
      ],
      'description-style': [1, { style: 'block' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'require-nullable-fields-with-oneof': [1],
      'unique-enum-value-names': [1],
      'require-field-of-type-query-in-mutation-result': [1],
    },
    {
      'require-deprecation-date': [1, { argumentName: 'deletionDate' }],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
      'unique-enum-value-names': [1],
    },
    {
      alphabetize: [
        1,
        {
          fields: ['ObjectTypeDefinition'],
          values: true,
          arguments: ['FieldDefinition'],
          definitions: false,
        },
      ],
    },
    {
      'input-name': [
        2,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: false,
        },
      ],
      'relay-arguments': [1, { includeBoth: false }],
      'relay-page-info': [1],
      'relay-edge-types': [
        2,
        { withEdgeSuffix: true, shouldImplementNode: true, listTypeCanWrapOnlyEdgeType: false },
      ],
      'no-typename-prefix': [1],
      'no-unreachable-types': [1],
      'relay-connection-types': [1],
      'no-scalar-result-type-on-mutation': [1],
      'require-nullable-fields-with-oneof': [1],
      'unique-enum-value-names': [1],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      'relay-arguments': [1, { includeBoth: false }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: false, listTypeCanWrapOnlyEdgeType: true },
      ],
      'naming-convention': [
        1,
        {
          types: { style: 'PascalCase', forbiddenSuffixes: ['Failure'] },
          Argument: {
            style: 'camelCase',
            forbiddenPrefixes: ['userUuid'],
            forbiddenSuffixes: ['UserId', 'userUuid'],
          },
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: { style: 'UPPER_CASE', ignorePattern: '^federation_' },
          InputValueDefinition: { style: 'camelCase', forbiddenSuffixes: ['UserId'] },
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['post', 'put', 'mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription', 'subscribe'],
            forbiddenSuffixes: ['Subscription'],
          },
          'FieldDefinition[parent.name.value=/.*(Error|Exception)/]': {
            forbiddenPrefixes: ['message'],
            forbiddenSuffixes: ['Message'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'strict-id-in-types': [
        1,
        {
          exceptions: {
            types: [
              'MonetaryAmount',
              'PageInfo',
              'MarketReturn',
              'InvestmentCategory',
              'SecurityHeadline',
              'ETFPrice',
              'StatementLink',
              'Eligibility',
              'Image',
              'StringKeyAsset',
            ],
            suffixes: ['CurrencyAmount', 'Error', 'Exception', 'Failure'],
          },
          acceptedIdNames: ['id'],
          acceptedIdTypes: ['ID'],
        },
      ],
      'relay-connection-types': [1],
      'require-nullable-result-in-root': [1],
      'no-scalar-result-type-on-mutation': [1],
      'require-nullable-fields-with-oneof': [1],
      'unique-enum-value-names': [1],
    },
    {
      'description-style': [1, { style: 'block' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'strict-id-in-types': [1, { acceptedIdNames: ['id'], acceptedIdTypes: ['ID'] }],
      'require-description': [1, { types: true, rootField: true, DirectiveDefinition: true }],
      'no-unreachable-types': [1],
      'no-hashtag-description': [1],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
      'unique-enum-value-names': [1],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: false,
        },
      ],
      'description-style': [1, { style: 'block' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'no-hashtag-description': [1],
      'require-deprecation-date': [1],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
      'unique-enum-value-names': [1],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: true,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      'description-style': [1, { style: 'block' }],
      'strict-id-in-types': [1, { acceptedIdTypes: ['ID'] }],
      'relay-connection-types': [1],
    },
    {
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'strict-id-in-types': [
        1,
        {
          exceptions: { suffixes: ['Filter', 'Connection'] },
          acceptedIdNames: ['id', 'identity'],
          acceptedIdTypes: ['ID'],
        },
      ],
      'require-deprecation-reason': [1],
      'require-nullable-fields-with-oneof': [1],
      'unique-enum-value-names': [1],
    },
    {
      alphabetize: [
        1,
        {
          fields: ['ObjectTypeDefinition', 'InterfaceTypeDefinition', 'InputObjectTypeDefinition'],
          arguments: ['Field', 'FieldDefinition'],
          definitions: false,
        },
      ],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: true,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      alphabetize: [
        1,
        {
          fields: ['ObjectTypeDefinition', 'InterfaceTypeDefinition', 'InputObjectTypeDefinition'],
          values: true,
          arguments: ['FieldDefinition', 'Field', 'DirectiveDefinition', 'Directive'],
          definitions: false,
        },
      ],
      'no-root-type': [1, { disallow: ['mutation', 'subscription'] }],
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: true, listTypeCanWrapOnlyEdgeType: true },
      ],
      'description-style': [1, { style: 'inline' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'strict-id-in-types': [1, { acceptedIdNames: ['id'], acceptedIdTypes: ['ID'] }],
      'require-description': [
        1,
        {
          types: true,
          rootField: true,
          FieldDefinition: true,
          EnumTypeDefinition: true,
          DirectiveDefinition: true,
          EnumValueDefinition: true,
          OperationDefinition: true,
          UnionTypeDefinition: true,
          InputValueDefinition: true,
          ObjectTypeDefinition: true,
          ScalarTypeDefinition: true,
          InterfaceTypeDefinition: true,
          InputObjectTypeDefinition: true,
        },
      ],
      'no-unreachable-types': [1],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'require-deprecation-date': [1],
      'require-deprecation-reason': [1],
      'require-nullable-result-in-root': [1],
      'require-type-pattern-with-oneof': [1],
      'no-scalar-result-type-on-mutation': [1],
      'require-nullable-fields-with-oneof': [1],
      'unique-enum-value-names': [1],
      'require-field-of-type-query-in-mutation-result': [1],
    },
    {
      'naming-convention': [
        1,
        {
          FieldDefinition: 'camelCase',
          InputValueDefinition: { style: 'camelCase' },
          ObjectTypeDefinition: { style: 'PascalCase' },
          InputObjectTypeDefinition: { style: 'PascalCase', requiredSuffixes: ['Input'] },
          'FieldDefinition[parent.name.value=Query]': {
            style: 'camelCase',
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            style: 'camelCase',
            forbiddenSuffixes: ['Mutation'],
          },
        },
      ],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      'description-style': [1, { style: 'block' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'strict-id-in-types': [
        1,
        { exceptions: {}, acceptedIdNames: ['id'], acceptedIdTypes: ['ID'] },
      ],
      'require-description': [1, { OperationDefinition: true }],
      'no-unreachable-types': [1],
      'no-hashtag-description': [1],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
      'unique-enum-value-names': [1],
    },
    { 'strict-id-in-types': [1, { acceptedIdNames: ['id'], acceptedIdTypes: ['ID'] }] },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: false,
          caseSensitiveInputType: false,
        },
      ],
      alphabetize: [1, { values: true, definitions: false }],
      'relay-arguments': [1, { includeBoth: false }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: false, shouldImplementNode: false, listTypeCanWrapOnlyEdgeType: false },
      ],
      'description-style': [1, { style: 'block' }],
      'naming-convention': [
        1,
        {
          types: {
            style: 'PascalCase',
            forbiddenPrefixes: ['Type', 'type'],
            forbiddenSuffixes: ['Type', 'type'],
          },
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          EnumTypeDefinition: {
            forbiddenPrefixes: ['enum', 'Enum'],
            forbiddenSuffixes: ['enum', 'Enum'],
          },
          FragmentDefinition: {
            style: 'PascalCase',
            forbiddenPrefixes: ['Fragment'],
            forbiddenSuffixes: ['Fragment'],
          },
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          UnionTypeDefinition: {
            style: 'PascalCase',
            forbiddenPrefixes: ['union', 'Union'],
            forbiddenSuffixes: ['union', 'Union'],
          },
          InputValueDefinition: 'camelCase',
          ObjectTypeDefinition: { forbiddenPrefixes: ['Type'], forbiddenSuffixes: ['Type'] },
          InterfaceTypeDefinition: {
            style: 'PascalCase',
            forbiddenPrefixes: ['interface', 'Interface'],
            forbiddenSuffixes: ['interface', 'Interface'],
          },
          InputObjectTypeDefinition: 'PascalCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get', 'list'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            requiredPrefixes: ['create', 'update', 'delete', 'terminate', 'add', 'remove'],
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'relay-connection-types': [1],
      'require-deprecation-reason': [1],
    },
    { 'no-unreachable-types': [1] },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: false,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      alphabetize: [1, { definitions: false }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
    },
    {
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: false,
          caseSensitiveInputType: true,
        },
      ],
      alphabetize: [
        1,
        {
          fields: ['ObjectTypeDefinition', 'InterfaceTypeDefinition', 'InputObjectTypeDefinition'],
          values: true,
          arguments: ['FieldDefinition', 'Field', 'DirectiveDefinition'],
          definitions: true,
        },
      ],
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: true, listTypeCanWrapOnlyEdgeType: false },
      ],
      'description-style': [1, { style: 'block' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          allowLeadingUnderscore: true,
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: [
              'query',
              'create',
              'delete',
              'get',
              'is',
              'remove',
              'set',
              'update',
            ],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: [
              'mutation',
              'create',
              'delete',
              'get',
              'is',
              'remove',
              'set',
              'update',
            ],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'require-description': [1, { rootField: true }],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: false,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'require-description': [
        1,
        {
          types: true,
          EnumTypeDefinition: true,
          EnumValueDefinition: true,
          UnionTypeDefinition: true,
          InputValueDefinition: true,
          ScalarTypeDefinition: true,
          InterfaceTypeDefinition: true,
        },
      ],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: true,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      alphabetize: [
        1,
        {
          fields: ['ObjectTypeDefinition', 'InterfaceTypeDefinition', 'InputObjectTypeDefinition'],
          values: true,
          arguments: ['Field', 'Directive', 'DirectiveDefinition', 'FieldDefinition'],
          definitions: true,
        },
      ],
      'relay-arguments': [1, { includeBoth: true }],
    },
    {
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
    },
    {
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: true, listTypeCanWrapOnlyEdgeType: false },
      ],
      'description-style': [1, { style: 'block' }],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'require-deprecation-date': [1],
      'require-deprecation-reason': [1],
      'require-nullable-result-in-root': [1],
      'no-scalar-result-type-on-mutation': [1],
      'unique-enum-value-names': [1],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: false,
          caseSensitiveInputType: false,
        },
      ],
      'no-typename-prefix': [1],
      'require-description': [
        1,
        {
          types: true,
          DirectiveDefinition: true,
          ScalarTypeDefinition: true,
          InterfaceTypeDefinition: true,
        },
      ],
      'require-nullable-fields-with-oneof': [1],
    },
    { 'require-deprecation-reason': [1] },
    {
      'require-description': [
        1,
        {
          types: true,
          DirectiveDefinition: true,
          ScalarTypeDefinition: true,
          InterfaceTypeDefinition: true,
        },
      ],
    },
    { alphabetize: [1, { definitions: false }] },
    {
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: true, listTypeCanWrapOnlyEdgeType: true },
      ],
      'relay-connection-types': [1],
    },
    { 'require-deprecation-reason': [1] },
    {
      'require-description': [
        1,
        {
          types: true,
          rootField: true,
          FieldDefinition: true,
          EnumTypeDefinition: true,
          DirectiveDefinition: true,
          EnumValueDefinition: true,
          OperationDefinition: true,
          UnionTypeDefinition: true,
          InputValueDefinition: true,
          ObjectTypeDefinition: true,
          ScalarTypeDefinition: true,
          InterfaceTypeDefinition: true,
          InputObjectTypeDefinition: true,
        },
      ],
    },
    {
      'strict-id-in-types': [
        1,
        {
          exceptions: {
            types: ['Tag', 'Member', 'GeoPosition', 'Schedule'],
            suffixes: ['Filter', 'Connection', 'Metric', 'Metrics', 'Value'],
          },
          acceptedIdNames: ['id', 'identity', 'operationId'],
          acceptedIdTypes: ['ID'],
        },
      ],
    },
    {
      'no-root-type': [1, { disallow: ['subscription'] }],
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'description-style': [1, { style: 'block' }],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
      'require-nullable-fields-with-oneof': [1],
      'unique-enum-value-names': [1],
    },
    {
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
    },
    { 'strict-id-in-types': [0] },
    {
      'input-name': [
        1,
        {
          checkQueries: true,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: false,
        },
      ],
      'no-root-type': [1, { disallow: ['subscription'] }],
      'description-style': [1, { style: 'block' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'PascalCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-unreachable-types': [1],
      'no-hashtag-description': [1],
      'no-scalar-result-type-on-mutation': [1],
      'unique-enum-value-names': [1],
    },
    {
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
    },
    {
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: true, listTypeCanWrapOnlyEdgeType: true },
      ],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: false,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      'description-style': [1, { style: 'block' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
    },
    {
      'input-name': [0],
      alphabetize: [0],
      'relay-arguments': [0],
      'relay-page-info': [0],
      'relay-edge-types': [0],
      'naming-convention': [0],
      'no-typename-prefix': [0],
      'no-hashtag-description': [0],
      'relay-connection-types': [0],
      'require-deprecation-reason': [0],
      'no-scalar-result-type-on-mutation': [0],
      'unique-enum-value-names': [0],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
    },
    {
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'require-deprecation-reason': [1],
    },
    { 'relay-page-info': [1], 'no-unreachable-types': [1] },
    {
      'no-root-type': [1, { disallow: ['subscription'] }],
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'description-style': [1, { style: 'inline' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'require-deprecation-date': [1],
      'require-deprecation-reason': [1],
      'require-type-pattern-with-oneof': [1],
      'no-scalar-result-type-on-mutation': [1],
      'require-nullable-fields-with-oneof': [1],
      'unique-enum-value-names': [1],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: false,
          caseSensitiveInputType: true,
        },
      ],
      alphabetize: [
        1,
        {
          fields: ['ObjectTypeDefinition', 'InterfaceTypeDefinition', 'InputObjectTypeDefinition'],
          values: true,
          arguments: ['FieldDefinition', 'Field', 'DirectiveDefinition'],
          definitions: true,
        },
      ],
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: true, listTypeCanWrapOnlyEdgeType: true },
      ],
      'description-style': [1, { style: 'block' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: [
              'query',
              'create',
              'delete',
              'get',
              'is',
              'remove',
              'set',
              'update',
            ],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: [
              'mutation',
              'create',
              'delete',
              'get',
              'is',
              'remove',
              'set',
              'update',
            ],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'require-description': [1, { rootField: true }],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: true,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      alphabetize: [
        1,
        {
          fields: ['ObjectTypeDefinition', 'InterfaceTypeDefinition', 'InputObjectTypeDefinition'],
          values: true,
          arguments: ['FieldDefinition', 'Field', 'DirectiveDefinition', 'Directive'],
          definitions: true,
        },
      ],
      'no-root-type': [1, { disallow: ['mutation', 'subscription'] }],
      'description-style': [1, { style: 'block' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          FragmentDefinition: {
            style: 'PascalCase',
            suffix: 'Fields',
            requiredSuffixes: ['Fields'],
            forbiddenPrefixes: ['Fragment'],
            forbiddenSuffixes: ['Fragment'],
          },
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'EnumTypeDefinition,EnumTypeExtension': {
            forbiddenPrefixes: ['Enum'],
            forbiddenSuffixes: ['Enum'],
          },
          'UnionTypeDefinition,UnionTypeExtension': {
            forbiddenPrefixes: ['Union'],
            forbiddenSuffixes: ['Union'],
          },
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'ObjectTypeDefinition,ObjectTypeExtension': {
            forbiddenPrefixes: ['Type'],
            forbiddenSuffixes: ['Type'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'InterfaceTypeDefinition,InterfaceTypeExtension': {
            forbiddenPrefixes: ['Interface'],
            forbiddenSuffixes: ['Interface'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'strict-id-in-types': [
        1,
        {
          exceptions: { types: ['Error'], suffixes: ['Payload'] },
          acceptedIdNames: ['id', '_id'],
          acceptedIdTypes: ['ID'],
        },
      ],
      'no-unreachable-types': [1],
      'no-hashtag-description': [1],
      'require-deprecation-date': [1, { argumentName: 'deletionDate' }],
      'require-deprecation-reason': [1],
      'require-type-pattern-with-oneof': [1],
      'no-scalar-result-type-on-mutation': [1],
      'require-nullable-fields-with-oneof': [1],
      'unique-enum-value-names': [1],
      'require-field-of-type-query-in-mutation-result': [1],
    },
    {
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: true, listTypeCanWrapOnlyEdgeType: true },
      ],
      'no-unreachable-types': [1],
      'relay-connection-types': [1],
      'require-deprecation-date': [1],
      'no-scalar-result-type-on-mutation': [1],
    },
    { 'no-root-type': [1, { disallow: ['mutation'] }] },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: false,
          caseSensitiveInputType: false,
        },
      ],
      'no-typename-prefix': [1],
      'require-deprecation-reason': [1],
    },
    {
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'require-deprecation-date': [1, { argumentName: 'deletionDate' }],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
      'unique-enum-value-names': [1],
    },
    { 'no-unreachable-types': [0] },
    { alphabetize: [1, { definitions: false }] },
    {
      'require-description': [
        1,
        {
          types: true,
          FieldDefinition: false,
          EnumTypeDefinition: false,
          DirectiveDefinition: false,
          OperationDefinition: false,
          InputValueDefinition: false,
          ScalarTypeDefinition: false,
          InputObjectTypeDefinition: false,
        },
      ],
      'require-deprecation-reason': [1],
    },
    { 'no-unreachable-types': [1] },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: false,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      'no-unreachable-types': [1],
      'require-deprecation-reason': [1],
    },

    {
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'PascalCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
    },
    {
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: true, listTypeCanWrapOnlyEdgeType: true },
      ],
      'description-style': [1, { style: 'block' }],
      'naming-convention': [
        2,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'require-description': [
        1,
        {
          types: true,
          rootField: true,
          FieldDefinition: true,
          EnumTypeDefinition: true,
          DirectiveDefinition: true,
          OperationDefinition: true,
          UnionTypeDefinition: true,
          InputValueDefinition: true,
          ObjectTypeDefinition: true,
          ScalarTypeDefinition: true,
          InterfaceTypeDefinition: true,
          InputObjectTypeDefinition: true,
        },
      ],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'require-deprecation-reason': [1],
    },
    {
      'naming-convention': [
        1,
        {
          FieldDefinition: 'camelCase',
          InputValueDefinition: { style: 'camelCase' },
          ObjectTypeDefinition: { style: 'PascalCase' },
          InputObjectTypeDefinition: { style: 'PascalCase', requiredSuffixes: ['Input'] },
          'FieldDefinition[parent.name.value=Query]': {
            style: 'camelCase',
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            style: 'camelCase',
            forbiddenSuffixes: ['Mutation'],
          },
        },
      ],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
    },
    {
      'require-description': [
        1,
        {
          types: true,
          rootField: true,
          FieldDefinition: true,
          EnumTypeDefinition: true,
          DirectiveDefinition: true,
          EnumValueDefinition: true,
          OperationDefinition: true,
          UnionTypeDefinition: true,
          InputValueDefinition: true,
          ObjectTypeDefinition: true,
          ScalarTypeDefinition: true,
          InterfaceTypeDefinition: true,
          InputObjectTypeDefinition: true,
        },
      ],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: true,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: true, listTypeCanWrapOnlyEdgeType: true },
      ],
      'require-description': [
        1,
        {
          types: true,
          FieldDefinition: true,
          EnumTypeDefinition: true,
          InputValueDefinition: true,
          ObjectTypeDefinition: true,
          InputObjectTypeDefinition: true,
        },
      ],
      'relay-connection-types': [1],
    },
    {
      'no-root-type': [1, { disallow: ['subscription'] }],
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'description-style': [1, { style: 'block' }],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
      'require-nullable-fields-with-oneof': [1],
      'unique-enum-value-names': [1],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: false,
          caseSensitiveInputType: true,
        },
      ],
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: true, listTypeCanWrapOnlyEdgeType: false },
      ],
      'naming-convention': [
        1,
        { types: 'PascalCase', FieldDefinition: 'camelCase', allowLeadingUnderscore: true },
      ],
      'no-typename-prefix': [1],
      'strict-id-in-types': [
        1,
        {
          exceptions: {
            types: ['Aggregate', 'PageInfo', 'Color', 'Location', 'RGBA', 'RichText'],
            suffixes: ['Connection', 'Edge'],
          },
          acceptedIdNames: ['id'],
          acceptedIdTypes: ['ID'],
        },
      ],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'unique-enum-value-names': [1],
    },
    {
      'no-root-type': [1, { disallow: ['subscription'] }],
      'relay-arguments': [1, { includeBoth: true }],
      'relay-page-info': [1],
      'description-style': [1, { style: 'inline' }],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'require-deprecation-date': [1],
      'require-deprecation-reason': [1],
      'require-type-pattern-with-oneof': [1],
      'no-scalar-result-type-on-mutation': [1],
      'require-nullable-fields-with-oneof': [1],
      'unique-enum-value-names': [1],
    },
    {
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get', 'list', 'fetch'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'require-description': [1, { types: true, rootField: true }],
      'no-unreachable-types': [1],
      'no-hashtag-description': [1],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
      'unique-enum-value-names': [1],
    },
    {
      'input-name': [0],
      alphabetize: [0],
      'relay-arguments': [0],
      'relay-page-info': [0],
      'relay-edge-types': [0],
      'naming-convention': [0],
      'no-typename-prefix': [0],
      'no-hashtag-description': [0],
      'relay-connection-types': [0],
      'require-deprecation-reason': [0],
      'no-scalar-result-type-on-mutation': [0],
      'unique-enum-value-names': [0],
    },
    { alphabetize: [1, { definitions: false }] },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: false,
        },
      ],
      'relay-arguments': [1, { includeBoth: false }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: false, listTypeCanWrapOnlyEdgeType: false },
      ],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: {
            style: 'UPPER_CASE',
            ignorePattern:
              '^(SuperAdmin|ElephantAdmin|Owner|Manager|Salesperson|Client|User|Inactive)',
          },
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'strict-id-in-types': [
        1,
        {
          exceptions: {
            types: [
              'CalendarIntegration',
              'PageInfo',
              'SuperAdminScope',
              'WebDomain',
              'ProfileItems',
              'BotSettings',
              'EmailEntry',
              'PhoneEntry',
              'TimeZoneOption',
              'JSONSchema',
              'JSONSchemaType',
              'JSONSchemaObject',
              'JSONSchemaArray',
              'JSONSchemaString',
              'JSONSchemaNumber',
              'JSONSchemaBoolean',
              'JSONSchemaNull',
              'Position',
              'SeatTierCounts',
              'TranscriptSentence',
              'TranscriptTimelineEntry',
              'SpeakerDetail',
            ],
            suffixes: ['Payload', 'Connection', 'Edge', 'Error', 'ZoomConfig', 'Attendee'],
          },
          acceptedIdNames: ['id'],
          acceptedIdTypes: ['ID'],
        },
      ],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'require-deprecation-date': [1],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: true,
        },
      ],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-unreachable-types': [1],
      'require-deprecation-reason': [1],
      'unique-enum-value-names': [1],
    },
    {
      'input-name': [
        1,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: true,
          caseSensitiveInputType: false,
        },
      ],
      alphabetize: [1, { values: true, definitions: false }],
      'relay-arguments': [1, { includeBoth: false }],
      'relay-page-info': [1],
      'relay-edge-types': [
        1,
        { withEdgeSuffix: true, shouldImplementNode: false, listTypeCanWrapOnlyEdgeType: true },
      ],
      'naming-convention': [
        1,
        {
          types: 'PascalCase',
          Argument: 'camelCase',
          FieldDefinition: 'camelCase',
          DirectiveDefinition: 'camelCase',
          EnumValueDefinition: 'UPPER_CASE',
          InputValueDefinition: 'camelCase',
          'FieldDefinition[parent.name.value=Query]': {
            forbiddenPrefixes: ['query', 'get'],
            forbiddenSuffixes: ['Query'],
          },
          'FieldDefinition[parent.name.value=Mutation]': {
            forbiddenPrefixes: ['mutation'],
            forbiddenSuffixes: ['Mutation'],
          },
          'FieldDefinition[parent.name.value=Subscription]': {
            forbiddenPrefixes: ['subscription'],
            forbiddenSuffixes: ['Subscription'],
          },
        },
      ],
      'no-typename-prefix': [1],
      'no-hashtag-description': [1],
      'relay-connection-types': [1],
      'require-deprecation-reason': [1],
      'no-scalar-result-type-on-mutation': [1],
      'unique-enum-value-names': [1],
    },
  ];

  for (const [index, sample] of samples.entries()) {
    it(`check config sample #${index}`, async () => {
      const policyObject = createPolicyFromESLint(sample);
      const { policy, tokens } = await prepareProject(ProjectType.Single);
      // Validates that the polict passes the config validations
      const response = await policy.setOrganizationSchemaPolicy(policyObject, true);
      expect(response.error).toEqual(null);

      const cli = createCLI(tokens.registry);
      await cli.publish({
        sdl: /* GraphQL */ `
          """
          Main query entrypoint
          """
          type Query {
            """
            test
            """
            foo: String!
          }
        `,
        expect: 'latest-composable',
      });

      // Validates that the policy pass runtime check
      await cli.check({
        sdl: /* GraphQL */ `
          type Query {
            """
            test
            """
            bar: String!
            """
            test
            """
            foo: String!
          }
        `,
        expect: 'approved',
      });
    });
  }
});
