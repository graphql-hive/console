import assert from 'node:assert';
import { describe, test } from 'node:test';
import { sql } from 'slonik';
import { createStorage } from '../../services/storage/src/index';
import { initMigrationTestingEnvironment } from './utils/testkit';

const TEST_CASES: Array<{ in: any; out: any }> = [
  {
    in: {
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
          values: ['EnumTypeDefinition'],
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
      'no-case-insensitive-enum-values-duplicates': [1],
      'require-field-of-type-query-in-mutation-result': [1],
    },
    out: {
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
      'unique-enum-value-names': [1],
      'require-nullable-fields-with-oneof': [1],
      'require-field-of-type-query-in-mutation-result': [1],
    },
  },
  {
    in: {
      'input-name': [
        2,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: false,
          caseSensitiveInputType: true,
        },
      ],
      'relay-arguments': [2, { includeBoth: true }],
      'relay-page-info': [2],
      'relay-edge-types': [
        2,
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
      'relay-connection-types': [2],
      'unique-enum-value-names': [1],
    },
    out: {
      'input-name': [
        2,
        {
          checkQueries: false,
          checkInputType: true,
          checkMutations: false,
          caseSensitiveInputType: true,
        },
      ],
      'relay-arguments': [2, { includeBoth: true }],
      'relay-page-info': [2],
      'relay-edge-types': [
        2,
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
      'relay-connection-types': [2],
      'unique-enum-value-names': [1],
    },
  },
  {
    in: {
      'require-description': [
        1,
        {
          types: true,
          rootField: false,
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
    out: {
      'require-description': [
        1,
        {
          types: true,
          rootField: false,
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
  },
];

await describe('migration: policy upgrade: graphql-eslint v3 -> v4', async () => {
  for (const [index, testCase] of TEST_CASES.entries()) {
    await test('should migrate all known breaking changes, sample ' + index, async () => {
      const { db, runTo, complete, done, seed, connectionString } =
        await initMigrationTestingEnvironment();
      const storage = await createStorage(connectionString, 1);
      try {
        // Run migrations all the way to the point before the one we are testing
        await runTo('2025.03.20T00-00-00.dangerous_breaking.ts');

        // Seed the database with some data (schema_sdl, supergraph_sdl, composite_schema_sdl)
        const admin = await seed.user({
          user: {
            name: 'test' + index,
            email: `test_${Date.now()}@test.com`,
          },
        });
        const organization = await seed.organization({
          organization: {
            name: `org-${Date.now()}`,
          },
          user: admin,
        });

        // Create an invitation to simulate a pending invitation
        await db.query(sql`
          INSERT INTO "schema_policy_config" ("resource_type", "resource_id", "config") VALUES ('ORGANIZATION', ${organization.id}, ${sql.jsonb(testCase.in)});
        `);

        // run the next migrations
        await runTo('2025.03.26T00-00-00.graphql-eslint.v4.ts');

        // assert scopes are still in place and identical
        const newRecord = await db.one(sql`
          SELECT config, config_v4 FROM schema_policy_config WHERE resource_id = ${organization.id}`);

        assert.deepStrictEqual(newRecord.config, testCase.in);
        assert.deepStrictEqual(newRecord.config_v4, testCase.out);

        await complete();
      } finally {
        await done();
        await storage.destroy();
      }
    });
  }
});
