import { HiveSchemaChangeModel } from '@hive/storage';
import type { Organization, Project } from '../../../shared/entities';
import type { SchemaChangeNotificationInput } from '../providers/adapters/common';

const TEST_ID = '00000000-0000-0000-0000-000000000000';
const TEST_TYPE_NAME = 'ThisIsATestPayload';

export function createTestSchemaChangeEvent(
  organization: Pick<Organization, 'id' | 'slug' | 'name'>,
  project: Pick<Project, 'id' | 'slug' | 'name'>,
): SchemaChangeNotificationInput['event'] {
  return {
    organization: {
      id: organization.id,
      cleanId: organization.slug,
      slug: organization.slug,
      name: organization.name,
    },
    project: {
      id: project.id,
      cleanId: project.slug,
      slug: project.slug,
      name: project.name,
    },
    target: {
      id: TEST_ID,
      cleanId: 'test-target',
      slug: 'test-target',
      name: 'Test target',
    },
    schema: {
      id: TEST_ID,
      commit: 'test',
      valid: true,
    },
    changes: [
      HiveSchemaChangeModel.parse({
        type: 'FIELD_REMOVED',
        meta: {
          typeName: TEST_TYPE_NAME,
          removedFieldName: 'removedExampleField',
          isRemovedFieldDeprecated: false,
          typeType: 'object type',
        },
      }),
      HiveSchemaChangeModel.parse({
        type: 'FIELD_ADDED',
        meta: {
          typeName: TEST_TYPE_NAME,
          addedFieldName: 'addedExampleField',
          typeType: 'object type',
          addedFieldReturnType: 'String',
        },
      }),
    ],
    messages: [],
    errors: [],
    initial: false,
  };
}
