/** These mirror DB models from  */
import crypto from 'node:crypto';
import stableJSONStringify from 'fast-json-stable-stringify';
import { SerializableValue } from 'slonik';
import { z } from 'zod';
import {
  CriticalityLevel,
  DirectiveAddedChange,
  DirectiveArgumentAddedChange,
  DirectiveArgumentDefaultValueChangedChange,
  DirectiveArgumentDescriptionChangedChange,
  DirectiveArgumentRemovedChange,
  DirectiveArgumentTypeChangedChange,
  DirectiveDescriptionChangedChange,
  DirectiveLocationAddedChange,
  DirectiveLocationRemovedChange,
  DirectiveRemovedChange,
  DirectiveUsageArgumentDefinitionAddedChange,
  DirectiveUsageArgumentDefinitionRemovedChange,
  DirectiveUsageEnumAddedChange,
  DirectiveUsageEnumRemovedChange,
  DirectiveUsageEnumValueAddedChange,
  DirectiveUsageEnumValueRemovedChange,
  DirectiveUsageFieldAddedChange,
  DirectiveUsageFieldDefinitionAddedChange,
  DirectiveUsageFieldDefinitionRemovedChange,
  DirectiveUsageFieldRemovedChange,
  DirectiveUsageInputFieldDefinitionAddedChange,
  DirectiveUsageInputFieldDefinitionRemovedChange,
  DirectiveUsageInputObjectAddedChange,
  DirectiveUsageInputObjectRemovedChange,
  DirectiveUsageInterfaceAddedChange,
  DirectiveUsageInterfaceRemovedChange,
  DirectiveUsageObjectAddedChange,
  DirectiveUsageObjectRemovedChange,
  DirectiveUsageScalarAddedChange,
  DirectiveUsageScalarRemovedChange,
  DirectiveUsageSchemaAddedChange,
  DirectiveUsageSchemaRemovedChange,
  DirectiveUsageUnionMemberAddedChange,
  DirectiveUsageUnionMemberRemovedChange,
  EnumValueAddedChange,
  EnumValueDeprecationReasonAddedChange,
  EnumValueDeprecationReasonChangedChange,
  EnumValueDeprecationReasonRemovedChange,
  EnumValueDescriptionChangedChange,
  EnumValueRemovedChange,
  FieldAddedChange,
  FieldArgumentAddedChange,
  FieldArgumentDefaultChangedChange,
  FieldArgumentDescriptionChangedChange,
  FieldArgumentRemovedChange,
  FieldArgumentTypeChangedChange,
  FieldDeprecationAddedChange,
  FieldDeprecationReasonAddedChange,
  FieldDeprecationReasonChangedChange,
  FieldDeprecationReasonRemovedChange,
  FieldDeprecationRemovedChange,
  FieldDescriptionAddedChange,
  FieldDescriptionChangedChange,
  FieldDescriptionRemovedChange,
  FieldRemovedChange,
  FieldTypeChangedChange,
  InputFieldAddedChange,
  InputFieldDefaultValueChangedChange,
  InputFieldDescriptionAddedChange,
  InputFieldDescriptionChangedChange,
  InputFieldDescriptionRemovedChange,
  InputFieldRemovedChange,
  InputFieldTypeChangedChange,
  ObjectTypeInterfaceAddedChange,
  ObjectTypeInterfaceRemovedChange,
  SchemaMutationTypeChangedChange,
  SchemaQueryTypeChangedChange,
  SchemaSubscriptionTypeChangedChange,
  SerializableChange,
  TypeAddedChange,
  TypeDescriptionAddedChange,
  TypeDescriptionChangedChange,
  TypeDescriptionRemovedChange,
  TypeKindChangedChange,
  TypeOfChangeType,
  TypeRemovedChange,
  UnionMemberAddedChange,
  UnionMemberRemovedChange,
} from '@graphql-inspector/core';
import {
  RegistryServiceUrlChangeSerializableChange,
  schemaChangeFromSerializableChange,
} from './schema-change-meta';

// prettier-ignore
const FieldArgumentDescriptionChangedLiteral = z.literal("FIELD_ARGUMENT_DESCRIPTION_CHANGED" satisfies `${FieldArgumentDescriptionChangedChange['type']}`)
// prettier-ignore
const FieldArgumentDefaultChangedLiteral = z.literal("FIELD_ARGUMENT_DEFAULT_CHANGED" satisfies `${FieldArgumentDefaultChangedChange['type']}`)
// prettier-ignore
const FieldArgumentTypeChangedLiteral = z.literal("FIELD_ARGUMENT_TYPE_CHANGED" satisfies `${FieldArgumentTypeChangedChange['type']}`)
// prettier-ignore
const DirectiveRemovedLiteral = z.literal("DIRECTIVE_REMOVED" satisfies `${DirectiveRemovedChange['type']}`)
// prettier-ignore
const DirectiveAddedLiteral = z.literal("DIRECTIVE_ADDED" satisfies `${DirectiveAddedChange['type']}`)
// prettier-ignore
const DirectiveDescriptionChangedLiteral = z.literal("DIRECTIVE_DESCRIPTION_CHANGED" satisfies `${DirectiveDescriptionChangedChange['type']}`)
// prettier-ignore
const DirectiveLocationAddedLiteral = z.literal("DIRECTIVE_LOCATION_ADDED" satisfies `${DirectiveLocationAddedChange['type']}`)
// prettier-ignore
const DirectiveLocationRemovedLiteral = z.literal("DIRECTIVE_LOCATION_REMOVED" satisfies `${DirectiveLocationRemovedChange['type']}`)
// prettier-ignore
const DirectiveArgumentAddedLiteral = z.literal("DIRECTIVE_ARGUMENT_ADDED" satisfies `${DirectiveArgumentAddedChange['type']}`)
// prettier-ignore
const DirectiveArgumentRemovedLiteral = z.literal("DIRECTIVE_ARGUMENT_REMOVED" satisfies `${DirectiveArgumentRemovedChange['type']}`)
// prettier-ignore
const DirectiveArgumentDescriptionChangedLiteral = z.literal("DIRECTIVE_ARGUMENT_DESCRIPTION_CHANGED" satisfies `${DirectiveArgumentDescriptionChangedChange['type']}`)
// prettier-ignore
const DirectiveArgumentDefaultValueChangedLiteral = z.literal("DIRECTIVE_ARGUMENT_DEFAULT_VALUE_CHANGED" satisfies `${DirectiveArgumentDefaultValueChangedChange['type']}`)
// prettier-ignore
const DirectiveArgumentTypeChangedLiteral = z.literal("DIRECTIVE_ARGUMENT_TYPE_CHANGED" satisfies `${DirectiveArgumentTypeChangedChange['type']}`)
// prettier-ignore
const EnumValueRemovedLiteral = z.literal("ENUM_VALUE_REMOVED" satisfies `${EnumValueRemovedChange['type']}`)
// prettier-ignore
const EnumValueAddedLiteral = z.literal("ENUM_VALUE_ADDED" satisfies `${EnumValueAddedChange['type']}`)
// prettier-ignore
const EnumValueDescriptionChangedLiteral = z.literal("ENUM_VALUE_DESCRIPTION_CHANGED" satisfies `${EnumValueDescriptionChangedChange['type']}`)
// prettier-ignore
const EnumValueDeprecationReasonChangedLiteral = z.literal("ENUM_VALUE_DEPRECATION_REASON_CHANGED" satisfies `${EnumValueDeprecationReasonChangedChange['type']}`)
// prettier-ignore
const EnumValueDeprecationReasonAddedLiteral = z.literal("ENUM_VALUE_DEPRECATION_REASON_ADDED" satisfies `${EnumValueDeprecationReasonAddedChange['type']}`)
// prettier-ignore
const EnumValueDeprecationReasonRemovedLiteral = z.literal("ENUM_VALUE_DEPRECATION_REASON_REMOVED" satisfies `${EnumValueDeprecationReasonRemovedChange['type']}`)
// prettier-ignore
const FieldRemovedLiteral = z.literal("FIELD_REMOVED" satisfies `${FieldRemovedChange['type']}`)
// prettier-ignore
const FieldAddedLiteral = z.literal("FIELD_ADDED" satisfies `${FieldAddedChange['type']}`)
// prettier-ignore
const FieldDescriptionChangedLiteral = z.literal("FIELD_DESCRIPTION_CHANGED" satisfies `${FieldDescriptionChangedChange['type']}`)
// prettier-ignore
const FieldDescriptionAddedLiteral = z.literal("FIELD_DESCRIPTION_ADDED" satisfies `${FieldDescriptionAddedChange['type']}`)
// prettier-ignore
const FieldDescriptionRemovedLiteral = z.literal("FIELD_DESCRIPTION_REMOVED" satisfies `${FieldDescriptionRemovedChange['type']}`)
// prettier-ignore
const FieldDeprecationAddedLiteral = z.literal("FIELD_DEPRECATION_ADDED" satisfies `${FieldDeprecationAddedChange['type']}`)
// prettier-ignore
const FieldDeprecationRemovedLiteral = z.literal("FIELD_DEPRECATION_REMOVED" satisfies `${FieldDeprecationRemovedChange['type']}`)
// prettier-ignore
const FieldDeprecationReasonChangedLiteral = z.literal("FIELD_DEPRECATION_REASON_CHANGED" satisfies `${FieldDeprecationReasonChangedChange['type']}`)
// prettier-ignore
const FieldDeprecationReasonAddedLiteral = z.literal("FIELD_DEPRECATION_REASON_ADDED" satisfies `${FieldDeprecationReasonAddedChange['type']}`)
// prettier-ignore
const FieldDeprecationReasonRemovedLiteral = z.literal("FIELD_DEPRECATION_REASON_REMOVED" satisfies `${FieldDeprecationReasonRemovedChange['type']}`)
// prettier-ignore
const FieldTypeChangedLiteral = z.literal("FIELD_TYPE_CHANGED" satisfies `${FieldTypeChangedChange['type']}`)
// prettier-ignore
const FieldArgumentAddedLiteral = z.literal("FIELD_ARGUMENT_ADDED" satisfies `${FieldArgumentAddedChange['type']}`)
// prettier-ignore
const FieldArgumentRemovedLiteral = z.literal("FIELD_ARGUMENT_REMOVED" satisfies `${FieldArgumentRemovedChange['type']}`)
// prettier-ignore
const InputFieldRemovedLiteral = z.literal("INPUT_FIELD_REMOVED" satisfies `${InputFieldRemovedChange['type']}`)
// prettier-ignore
const InputFieldAddedLiteral = z.literal("INPUT_FIELD_ADDED" satisfies `${InputFieldAddedChange['type']}`)
// prettier-ignore
const InputFieldDescriptionAddedLiteral = z.literal("INPUT_FIELD_DESCRIPTION_ADDED" satisfies `${InputFieldDescriptionAddedChange['type']}`)
// prettier-ignore
const InputFieldDescriptionRemovedLiteral = z.literal("INPUT_FIELD_DESCRIPTION_REMOVED" satisfies `${InputFieldDescriptionRemovedChange['type']}`)
// prettier-ignore
const InputFieldDescriptionChangedLiteral = z.literal("INPUT_FIELD_DESCRIPTION_CHANGED" satisfies `${InputFieldDescriptionChangedChange['type']}`)
// prettier-ignore
const InputFieldDefaultValueChangedLiteral = z.literal("INPUT_FIELD_DEFAULT_VALUE_CHANGED" satisfies `${InputFieldDefaultValueChangedChange['type']}`)
// prettier-ignore
const InputFieldTypeChangedLiteral = z.literal("INPUT_FIELD_TYPE_CHANGED" satisfies `${InputFieldTypeChangedChange['type']}`)
// prettier-ignore
const ObjectTypeInterfaceAddedLiteral = z.literal("OBJECT_TYPE_INTERFACE_ADDED" satisfies `${ObjectTypeInterfaceAddedChange['type']}`)
// prettier-ignore
const ObjectTypeInterfaceRemovedLiteral = z.literal("OBJECT_TYPE_INTERFACE_REMOVED" satisfies `${ObjectTypeInterfaceRemovedChange['type']}`)
// prettier-ignore
const SchemaQueryTypeChangedLiteral = z.literal("SCHEMA_QUERY_TYPE_CHANGED" satisfies `${SchemaQueryTypeChangedChange['type']}`)
// prettier-ignore
const SchemaMutationTypeChangedLiteral = z.literal("SCHEMA_MUTATION_TYPE_CHANGED" satisfies `${SchemaMutationTypeChangedChange['type']}`)
// prettier-ignore
const SchemaSubscriptionTypeChangedLiteral = z.literal("SCHEMA_SUBSCRIPTION_TYPE_CHANGED" satisfies `${SchemaSubscriptionTypeChangedChange['type']}`)
// prettier-ignore
const TypeRemovedLiteral = z.literal("TYPE_REMOVED" satisfies `${TypeRemovedChange['type']}`)
// prettier-ignore
const TypeAddedLiteral = z.literal("TYPE_ADDED" satisfies `${TypeAddedChange['type']}`)
// prettier-ignore
const TypeKindChangedLiteral = z.literal("TYPE_KIND_CHANGED" satisfies `${TypeKindChangedChange['type']}`)
// prettier-ignore
const TypeDescriptionChangedLiteral = z.literal("TYPE_DESCRIPTION_CHANGED" satisfies `${TypeDescriptionChangedChange['type']}`)
// prettier-ignore
const TypeDescriptionRemovedLiteral = z.literal("TYPE_DESCRIPTION_REMOVED" satisfies `${TypeDescriptionRemovedChange['type']}`)
// prettier-ignore
const TypeDescriptionAddedLiteral = z.literal("TYPE_DESCRIPTION_ADDED" satisfies `${TypeDescriptionAddedChange['type']}`)
// prettier-ignore
const UnionMemberRemovedLiteral = z.literal("UNION_MEMBER_REMOVED" satisfies `${UnionMemberRemovedChange['type']}`)
// prettier-ignore
const UnionMemberAddedLiteral = z.literal("UNION_MEMBER_ADDED" satisfies `${UnionMemberAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageUnionMemberAddedLiteral = z.literal("DIRECTIVE_USAGE_UNION_MEMBER_ADDED" satisfies `${DirectiveUsageUnionMemberAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageUnionMemberRemovedLiteral = z.literal("DIRECTIVE_USAGE_UNION_MEMBER_REMOVED" satisfies `${DirectiveUsageUnionMemberRemovedChange['type']}`)
// prettier-ignore
const DirectiveUsageEnumAddedLiteral = z.literal("DIRECTIVE_USAGE_ENUM_ADDED" satisfies `${DirectiveUsageEnumAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageEnumRemovedLiteral = z.literal("DIRECTIVE_USAGE_ENUM_REMOVED" satisfies `${DirectiveUsageEnumRemovedChange['type']}`)
// prettier-ignore
const DirectiveUsageEnumValueAddedLiteral = z.literal("DIRECTIVE_USAGE_ENUM_VALUE_ADDED" satisfies `${DirectiveUsageEnumValueAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageEnumValueRemovedLiteral = z.literal("DIRECTIVE_USAGE_ENUM_VALUE_REMOVED" satisfies `${DirectiveUsageEnumValueRemovedChange['type']}`)
// prettier-ignore
const DirectiveUsageInputObjectAddedLiteral = z.literal("DIRECTIVE_USAGE_INPUT_OBJECT_ADDED" satisfies `${DirectiveUsageInputObjectAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageInputObjectRemovedLiteral = z.literal("DIRECTIVE_USAGE_INPUT_OBJECT_REMOVED" satisfies `${DirectiveUsageInputObjectRemovedChange['type']}`)
// prettier-ignore
const DirectiveUsageFieldAddedLiteral = z.literal("DIRECTIVE_USAGE_FIELD_ADDED" satisfies `${DirectiveUsageFieldAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageFieldRemovedLiteral = z.literal("DIRECTIVE_USAGE_FIELD_REMOVED" satisfies `${DirectiveUsageFieldRemovedChange['type']}`)
// prettier-ignore
const DirectiveUsageScalarAddedLiteral = z.literal("DIRECTIVE_USAGE_SCALAR_ADDED" satisfies `${DirectiveUsageScalarAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageScalarRemovedLiteral = z.literal("DIRECTIVE_USAGE_SCALAR_REMOVED" satisfies `${DirectiveUsageScalarRemovedChange['type']}`)
// prettier-ignore
const DirectiveUsageObjectAddedLiteral = z.literal("DIRECTIVE_USAGE_OBJECT_ADDED" satisfies `${DirectiveUsageObjectAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageObjectRemovedLiteral = z.literal("DIRECTIVE_USAGE_OBJECT_REMOVED" satisfies `${DirectiveUsageObjectRemovedChange['type']}`)
// prettier-ignore
const DirectiveUsageInterfaceAddedLiteral = z.literal("DIRECTIVE_USAGE_INTERFACE_ADDED" satisfies `${DirectiveUsageInterfaceAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageInterfaceRemovedLiteral = z.literal("DIRECTIVE_USAGE_INTERFACE_REMOVED" satisfies `${DirectiveUsageInterfaceRemovedChange['type']}`)
// prettier-ignore
const DirectiveUsageArgumentDefinitionAddedLiteral = z.literal("DIRECTIVE_USAGE_ARGUMENT_DEFINITION_ADDED" satisfies `${DirectiveUsageArgumentDefinitionAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageArgumentDefinitionRemovedLiteral = z.literal("DIRECTIVE_USAGE_ARGUMENT_DEFINITION_REMOVED" satisfies `${DirectiveUsageArgumentDefinitionRemovedChange['type']}`)
// prettier-ignore
const DirectiveUsageSchemaAddedLiteral = z.literal("DIRECTIVE_USAGE_SCHEMA_ADDED" satisfies `${DirectiveUsageSchemaAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageSchemaRemovedLiteral = z.literal("DIRECTIVE_USAGE_SCHEMA_REMOVED" satisfies `${DirectiveUsageSchemaRemovedChange['type']}`)
// prettier-ignore
const DirectiveUsageFieldDefinitionAddedLiteral = z.literal("DIRECTIVE_USAGE_FIELD_DEFINITION_ADDED" satisfies `${DirectiveUsageFieldDefinitionAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageFieldDefinitionRemovedLiteral = z.literal("DIRECTIVE_USAGE_FIELD_DEFINITION_REMOVED" satisfies `${DirectiveUsageFieldDefinitionRemovedChange['type']}`)
// prettier-ignore
const DirectiveUsageInputFieldDefinitionAddedLiteral = z.literal("DIRECTIVE_USAGE_INPUT_FIELD_DEFINITION_ADDED" satisfies `${DirectiveUsageInputFieldDefinitionAddedChange['type']}`)
// prettier-ignore
const DirectiveUsageInputFieldDefinitionRemovedLiteral = z.literal("DIRECTIVE_USAGE_INPUT_FIELD_DEFINITION_REMOVED" satisfies `${DirectiveUsageInputFieldDefinitionRemovedChange['type']}`)

/**
 * @source https://github.com/colinhacks/zod/issues/372#issuecomment-1280054492
 */
type Implements<Model> = {
  [key in keyof Model]-?: undefined extends Model[key]
    ? null extends Model[key]
      ? z.ZodNullableType<z.ZodOptionalType<z.ZodType<Model[key]>>>
      : z.ZodOptionalType<z.ZodType<Model[key]>>
    : null extends Model[key]
      ? z.ZodNullableType<z.ZodType<Model[key]>>
      : Model[key] extends TypeOfChangeType
        ? z.ZodLiteral<`${Model[key]}`>
        : z.ZodType<Model[key]>;
};

export function implement<Model = never>() {
  return {
    with: <
      Schema extends Implements<Model> & {
        [unknownKey in Exclude<keyof Schema, keyof Model>]: never;
      },
    >(
      schema: Schema,
    ) => z.object(schema),
  };
}

export const FieldArgumentDescriptionChangedModel =
  implement<FieldArgumentDescriptionChangedChange>().with({
    type: FieldArgumentDescriptionChangedLiteral,
    meta: z.object({
      typeName: z.string(),
      fieldName: z.string(),
      argumentName: z.string(),
      oldDescription: z.union([z.string(), z.null()]),
      newDescription: z.union([z.string(), z.null()]),
    }),
  });

export const FieldArgumentDefaultChangedModel = implement<FieldArgumentDefaultChangedChange>().with(
  {
    type: FieldArgumentDefaultChangedLiteral,
    meta: z.object({
      typeName: z.string(),
      fieldName: z.string(),
      argumentName: z.string(),
      oldDefaultValue: z.optional(z.string()),
      newDefaultValue: z.optional(z.string()),
    }),
  },
);

export const FieldArgumentTypeChangedModel = implement<FieldArgumentTypeChangedChange>().with({
  type: FieldArgumentTypeChangedLiteral,
  meta: z.object({
    typeName: z.string(),
    fieldName: z.string(),
    argumentName: z.string(),
    oldArgumentType: z.string(),
    newArgumentType: z.string(),
    isSafeArgumentTypeChange: z.boolean(),
  }),
});

export const DirectiveRemovedModel = implement<DirectiveRemovedChange>().with({
  type: DirectiveRemovedLiteral,
  meta: z.object({
    removedDirectiveName: z.string(),
  }),
});

export const DirectiveAddedModel = implement<DirectiveAddedChange>().with({
  type: DirectiveAddedLiteral,
  meta: z.object({
    addedDirectiveName: z.string(),
  }),
});

export const DirectiveDescriptionChangedModel = implement<DirectiveDescriptionChangedChange>().with(
  {
    type: DirectiveDescriptionChangedLiteral,
    meta: z.object({
      directiveName: z.string(),
      oldDirectiveDescription: z.union([z.string(), z.null()]),
      newDirectiveDescription: z.union([z.string(), z.null()]),
    }),
  },
);

export const DirectiveLocationAddedModel = implement<DirectiveLocationAddedChange>().with({
  type: DirectiveLocationAddedLiteral,
  meta: z.object({
    directiveName: z.string(),
    addedDirectiveLocation: z.string(),
  }),
});

export const DirectiveLocationRemovedModel = implement<DirectiveLocationRemovedChange>().with({
  type: DirectiveLocationRemovedLiteral,
  meta: z.object({
    directiveName: z.string(),
    removedDirectiveLocation: z.string(),
  }),
});

export const DirectiveArgumentAddedModel = implement<DirectiveArgumentAddedChange>().with({
  type: DirectiveArgumentAddedLiteral,
  meta: z.object({
    directiveName: z.string(),
    addedDirectiveArgumentName: z.string(),
    addedDirectiveArgumentTypeIsNonNull: z.boolean(),
  }),
});

export const DirectiveArgumentRemovedModel = implement<DirectiveArgumentRemovedChange>().with({
  type: DirectiveArgumentRemovedLiteral,
  meta: z.object({
    directiveName: z.string(),
    removedDirectiveArgumentName: z.string(),
  }),
});

export const DirectiveArgumentDescriptionChangedModel =
  implement<DirectiveArgumentDescriptionChangedChange>().with({
    type: DirectiveArgumentDescriptionChangedLiteral,
    meta: z.object({
      directiveName: z.string(),
      directiveArgumentName: z.string(),
      oldDirectiveArgumentDescription: z.union([z.string(), z.null()]),
      newDirectiveArgumentDescription: z.union([z.string(), z.null()]),
    }),
  });

export const DirectiveArgumentDefaultValueChangedModel =
  implement<DirectiveArgumentDefaultValueChangedChange>().with({
    type: DirectiveArgumentDefaultValueChangedLiteral,
    meta: z.object({
      directiveName: z.string(),
      directiveArgumentName: z.string(),
      oldDirectiveArgumentDefaultValue: z.optional(z.string()),
      newDirectiveArgumentDefaultValue: z.optional(z.string()),
    }),
  });

export const DirectiveArgumentTypeChangedModel =
  implement<DirectiveArgumentTypeChangedChange>().with({
    type: DirectiveArgumentTypeChangedLiteral,
    meta: z.object({
      directiveName: z.string(),
      directiveArgumentName: z.string(),
      oldDirectiveArgumentType: z.string(),
      newDirectiveArgumentType: z.string(),
      isSafeDirectiveArgumentTypeChange: z.boolean(),
    }),
  });

// Enum

export const EnumValueRemovedModel = implement<EnumValueRemovedChange>().with({
  type: EnumValueRemovedLiteral,
  meta: z.object({
    enumName: z.string(),
    removedEnumValueName: z.string(),
    isEnumValueDeprecated: z.boolean(),
  }),
});

export const EnumValueAdded = implement<EnumValueAddedChange>().with({
  type: EnumValueAddedLiteral,
  meta: z.object({
    enumName: z.string(),
    addedEnumValueName: z.string(),
  }),
});

export const EnumValueDescriptionChangedModel = implement<EnumValueDescriptionChangedChange>().with(
  {
    type: EnumValueDescriptionChangedLiteral,
    meta: z.object({
      enumName: z.string(),
      enumValueName: z.string(),
      oldEnumValueDescription: z.union([z.string(), z.null()]),
      newEnumValueDescription: z.union([z.string(), z.null()]),
    }),
  },
);

export const EnumValueDeprecationReasonChangedModel =
  implement<EnumValueDeprecationReasonChangedChange>().with({
    type: EnumValueDeprecationReasonChangedLiteral,
    meta: z.object({
      enumName: z.string(),
      enumValueName: z.string(),
      oldEnumValueDeprecationReason: z.string(),
      newEnumValueDeprecationReason: z.string(),
    }),
  });

export const EnumValueDeprecationReasonAddedModel =
  implement<EnumValueDeprecationReasonAddedChange>().with({
    type: EnumValueDeprecationReasonAddedLiteral,
    meta: z.object({
      enumName: z.string(),
      enumValueName: z.string(),
      addedValueDeprecationReason: z.string(),
    }),
  });

export const EnumValueDeprecationReasonRemovedModel =
  implement<EnumValueDeprecationReasonRemovedChange>().with({
    type: EnumValueDeprecationReasonRemovedLiteral,
    meta: z.object({
      enumName: z.string(),
      enumValueName: z.string(),
      removedEnumValueDeprecationReason: z.string(),
    }),
  });

// Field

export const FieldRemovedModel = implement<FieldRemovedChange>().with({
  type: FieldRemovedLiteral,
  meta: z.object({
    typeName: z.string(),
    removedFieldName: z.string(),
    isRemovedFieldDeprecated: z.boolean(),
    typeType: z.string(),
  }),
});

export const FieldAddedModel = implement<FieldAddedChange>().with({
  type: FieldAddedLiteral,
  meta: z.object({
    typeName: z.string(),
    addedFieldName: z.string(),
    typeType: z.string(),
  }),
});

export const FieldDescriptionChangedModel = implement<FieldDescriptionChangedChange>().with({
  type: FieldDescriptionChangedLiteral,
  meta: z.object({
    typeName: z.string(),
    fieldName: z.string(),
    oldDescription: z.string(),
    newDescription: z.string(),
  }),
});

export const FieldDescriptionAddedModel = implement<FieldDescriptionAddedChange>().with({
  type: FieldDescriptionAddedLiteral,
  meta: z.object({
    typeName: z.string(),
    fieldName: z.string(),
    addedDescription: z.string(),
  }),
});

export const FieldDescriptionRemovedModel = implement<FieldDescriptionRemovedChange>().with({
  type: FieldDescriptionRemovedLiteral,
  meta: z.object({
    typeName: z.string(),
    fieldName: z.string(),
  }),
});

export const FieldDeprecationAddedModel = implement<FieldDeprecationAddedChange>().with({
  type: FieldDeprecationAddedLiteral,
  meta: z.object({
    typeName: z.string(),
    fieldName: z.string(),
  }),
});

export const FieldDeprecationRemovedModel = implement<FieldDeprecationRemovedChange>().with({
  type: FieldDeprecationRemovedLiteral,
  meta: z.object({
    typeName: z.string(),
    fieldName: z.string(),
  }),
});

export const FieldDeprecationReasonChangedModel =
  implement<FieldDeprecationReasonChangedChange>().with({
    type: FieldDeprecationReasonChangedLiteral,
    meta: z.object({
      typeName: z.string(),
      fieldName: z.string(),
      oldDeprecationReason: z.string(),
      newDeprecationReason: z.string(),
    }),
  });

export const FieldDeprecationReasonAddedModel = implement<FieldDeprecationReasonAddedChange>().with(
  {
    type: FieldDeprecationReasonAddedLiteral,
    meta: z.object({
      typeName: z.string(),
      fieldName: z.string(),
      addedDeprecationReason: z.string(),
    }),
  },
);

export const FieldDeprecationReasonRemovedModel =
  implement<FieldDeprecationReasonRemovedChange>().with({
    type: FieldDeprecationReasonRemovedLiteral,
    meta: z.object({
      typeName: z.string(),
      fieldName: z.string(),
    }),
  });

export const FieldTypeChangedModel = implement<FieldTypeChangedChange>().with({
  type: FieldTypeChangedLiteral,
  meta: z.object({
    typeName: z.string(),
    fieldName: z.string(),
    oldFieldType: z.string(),
    newFieldType: z.string(),
    isSafeFieldTypeChange: z.boolean(),
  }),
});

export const FieldArgumentAddedModel = implement<FieldArgumentAddedChange>().with({
  type: FieldArgumentAddedLiteral,
  meta: z.object({
    typeName: z.string(),
    fieldName: z.string(),
    addedArgumentName: z.string(),
    addedArgumentType: z.string(),
    hasDefaultValue: z.boolean(),
    isAddedFieldArgumentBreaking: z.boolean(),
  }),
});

export const FieldArgumentRemovedModel = implement<FieldArgumentRemovedChange>().with({
  type: FieldArgumentRemovedLiteral,
  meta: z.object({
    typeName: z.string(),
    fieldName: z.string(),
    removedFieldArgumentName: z.string(),
    removedFieldType: z.string(),
  }),
});

// Input

export const InputFieldRemovedModel = implement<InputFieldRemovedChange>().with({
  type: InputFieldRemovedLiteral,
  meta: z.object({
    inputName: z.string(),
    removedFieldName: z.string(),
    isInputFieldDeprecated: z.boolean(),
  }),
});

export const InputFieldAddedModel = implement<InputFieldAddedChange>().with({
  type: InputFieldAddedLiteral,
  meta: z.object({
    inputName: z.string(),
    addedInputFieldName: z.string(),
    isAddedInputFieldTypeNullable: z.boolean(),
    addedInputFieldType: z.string(),
  }),
});

export const InputFieldDescriptionAddedModel = implement<InputFieldDescriptionAddedChange>().with({
  type: InputFieldDescriptionAddedLiteral,
  meta: z.object({
    inputName: z.string(),
    inputFieldName: z.string(),
    addedInputFieldDescription: z.string(),
  }),
});

export const InputFieldDescriptionRemovedModel =
  implement<InputFieldDescriptionRemovedChange>().with({
    type: InputFieldDescriptionRemovedLiteral,
    meta: z.object({
      inputName: z.string(),
      inputFieldName: z.string(),
      removedDescription: z.string(),
    }),
  });

export const InputFieldDescriptionChangedModel =
  implement<InputFieldDescriptionChangedChange>().with({
    type: InputFieldDescriptionChangedLiteral,
    meta: z.object({
      inputName: z.string(),
      inputFieldName: z.string(),
      oldInputFieldDescription: z.string(),
      newInputFieldDescription: z.string(),
    }),
  });

export const InputFieldDefaultValueChangedModel =
  implement<InputFieldDefaultValueChangedChange>().with({
    type: InputFieldDefaultValueChangedLiteral,
    meta: z.object({
      inputName: z.string(),
      inputFieldName: z.string(),
      oldDefaultValue: z.optional(z.string()),
      newDefaultValue: z.optional(z.string()),
    }),
  });

export const InputFieldTypeChangedModel = implement<InputFieldTypeChangedChange>().with({
  type: InputFieldTypeChangedLiteral,
  meta: z.object({
    inputName: z.string(),
    inputFieldName: z.string(),
    oldInputFieldType: z.string(),
    newInputFieldType: z.string(),
    isInputFieldTypeChangeSafe: z.boolean(),
  }),
});

// Type

export const ObjectTypeInterfaceAddedModel = implement<ObjectTypeInterfaceAddedChange>().with({
  type: ObjectTypeInterfaceAddedLiteral,
  meta: z.object({
    objectTypeName: z.string(),
    addedInterfaceName: z.string(),
  }),
});

export const ObjectTypeInterfaceRemovedModel = implement<ObjectTypeInterfaceRemovedChange>().with({
  type: ObjectTypeInterfaceRemovedLiteral,
  meta: z.object({
    objectTypeName: z.string(),
    removedInterfaceName: z.string(),
  }),
});

// Schema

export const SchemaQueryTypeChangedModel = implement<SchemaQueryTypeChangedChange>().with({
  type: SchemaQueryTypeChangedLiteral,
  meta: z.object({
    oldQueryTypeName: z.string(),
    newQueryTypeName: z.string(),
  }),
});

export const SchemaMutationTypeChangedModel = implement<SchemaMutationTypeChangedChange>().with({
  type: SchemaMutationTypeChangedLiteral,
  meta: z.object({
    oldMutationTypeName: z.string(),
    newMutationTypeName: z.string(),
  }),
});

export const SchemaSubscriptionTypeChangedModel =
  implement<SchemaSubscriptionTypeChangedChange>().with({
    type: SchemaSubscriptionTypeChangedLiteral,
    meta: z.object({
      oldSubscriptionTypeName: z.string(),
      newSubscriptionTypeName: z.string(),
    }),
  });

// Type
export const TypeRemovedModel = implement<TypeRemovedChange>().with({
  type: TypeRemovedLiteral,
  meta: z.object({
    removedTypeName: z.string(),
  }),
});

export const TypeAddedModel = implement<TypeAddedChange>().with({
  type: TypeAddedLiteral,
  meta: z.object({
    addedTypeName: z.string(),
  }),
});

export const TypeKindChangedModel = implement<TypeKindChangedChange>().with({
  type: TypeKindChangedLiteral,
  meta: z.object({
    typeName: z.string(),
    oldTypeKind: z.string(),
    newTypeKind: z.string(),
  }),
});

export const TypeDescriptionChangedModel = implement<TypeDescriptionChangedChange>().with({
  type: TypeDescriptionChangedLiteral,
  meta: z.object({
    typeName: z.string(),
    oldTypeDescription: z.string(),
    newTypeDescription: z.string(),
  }),
});

export const TypeDescriptionAddedModel = implement<TypeDescriptionAddedChange>().with({
  type: TypeDescriptionAddedLiteral,
  meta: z.object({
    typeName: z.string(),
    addedTypeDescription: z.string(),
  }),
});

export const TypeDescriptionRemovedModel = implement<TypeDescriptionRemovedChange>().with({
  type: TypeDescriptionRemovedLiteral,
  meta: z.object({
    typeName: z.string(),
    removedTypeDescription: z.string(),
  }),
});

// Union
export const UnionMemberRemovedModel = implement<UnionMemberRemovedChange>().with({
  type: UnionMemberRemovedLiteral,
  meta: z.object({
    unionName: z.string(),
    removedUnionMemberTypeName: z.string(),
  }),
});

export const UnionMemberAddedModel = implement<UnionMemberAddedChange>().with({
  type: UnionMemberAddedLiteral,
  meta: z.object({
    unionName: z.string(),
    addedUnionMemberTypeName: z.string(),
  }),
});

// Service Registry Url Change

export const RegistryServiceUrlChangeModel =
  implement<RegistryServiceUrlChangeSerializableChange>().with({
    type: z.literal('REGISTRY_SERVICE_URL_CHANGED'),
    meta: z.object({
      serviceName: z.string(),
      serviceUrls: z.union([
        z.object({
          old: z.null(),
          new: z.string(),
        }),
        z.object({
          old: z.string(),
          new: z.null(),
        }),
        z.object({
          old: z.string(),
          new: z.string(),
        }),
      ]),
    }),
  });

const DirectiveUsageEnumAddedModel = implement<DirectiveUsageEnumAddedChange>().with({
  type: DirectiveUsageEnumAddedLiteral,
  meta: z.object({
    enumName: z.string(),
    addedDirectiveName: z.string(),
  }),
});

const DirectiveUsageEnumRemovedModel = implement<DirectiveUsageEnumRemovedChange>().with({
  type: DirectiveUsageEnumRemovedLiteral,
  meta: z.object({
    enumName: z.string(),
    removedDirectiveName: z.string(),
  }),
});

const DirectiveUsageEnumValueAddedModel = implement<DirectiveUsageEnumValueAddedChange>().with({
  type: DirectiveUsageEnumValueAddedLiteral,
  meta: z.object({
    enumName: z.string(),
    enumValueName: z.string(),
    addedDirectiveName: z.string(),
  }),
});

const DirectiveUsageEnumValueRemovedModel = implement<DirectiveUsageEnumValueRemovedChange>().with({
  type: DirectiveUsageEnumValueRemovedLiteral,
  meta: z.object({
    enumName: z.string(),
    enumValueName: z.string(),
    removedDirectiveName: z.string(),
  }),
});

const DirectiveUsageInputObjectRemovedModel =
  implement<DirectiveUsageInputObjectRemovedChange>().with({
    type: DirectiveUsageInputObjectRemovedLiteral,
    meta: z.object({
      inputObjectName: z.string(),
      removedInputFieldName: z.string(),
      isRemovedInputFieldTypeNullable: z.boolean(),
      removedInputFieldType: z.string(),
      removedDirectiveName: z.string(),
    }),
  });

const DirectiveUsageInputObjectAddedModel = implement<DirectiveUsageInputObjectAddedChange>().with({
  type: DirectiveUsageInputObjectAddedLiteral,
  meta: z.object({
    inputObjectName: z.string(),
    addedInputFieldName: z.string(),
    isAddedInputFieldTypeNullable: z.boolean(),
    addedInputFieldType: z.string(),
    addedDirectiveName: z.string(),
  }),
});

const DirectiveUsageInputFieldDefinitionAddedModel =
  implement<DirectiveUsageInputFieldDefinitionAddedChange>().with({
    type: DirectiveUsageInputFieldDefinitionAddedLiteral,
    meta: z.object({
      inputObjectName: z.string(),
      inputFieldName: z.string(),
      addedDirectiveName: z.string(),
    }),
  });

const DirectiveUsageInputFieldDefinitionRemovedModel =
  implement<DirectiveUsageInputFieldDefinitionRemovedChange>().with({
    type: DirectiveUsageInputFieldDefinitionRemovedLiteral,
    meta: z.object({
      inputObjectName: z.string(),
      inputFieldName: z.string(),
      removedDirectiveName: z.string(),
    }),
  });

const DirectiveUsageFieldAddedModel = implement<DirectiveUsageFieldAddedChange>().with({
  type: DirectiveUsageFieldAddedLiteral,
  meta: z.object({
    typeName: z.string(),
    fieldName: z.string(),
    addedDirectiveName: z.string(),
  }),
});

const DirectiveUsageFieldRemovedModel = implement<DirectiveUsageFieldRemovedChange>().with({
  type: DirectiveUsageFieldRemovedLiteral,
  meta: z.object({
    typeName: z.string(),
    fieldName: z.string(),
    removedDirectiveName: z.string(),
  }),
});

const DirectiveUsageScalarAddedModel = implement<DirectiveUsageScalarAddedChange>().with({
  type: DirectiveUsageScalarAddedLiteral,
  meta: z.object({
    scalarName: z.string(),
    addedDirectiveName: z.string(),
  }),
});

const DirectiveUsageScalarRemovedModel = implement<DirectiveUsageScalarRemovedChange>().with({
  type: DirectiveUsageScalarRemovedLiteral,
  meta: z.object({
    scalarName: z.string(),
    removedDirectiveName: z.string(),
  }),
});

const DirectiveUsageObjectAddedModel = implement<DirectiveUsageObjectAddedChange>().with({
  type: DirectiveUsageObjectAddedLiteral,
  meta: z.object({
    objectName: z.string(),
    addedDirectiveName: z.string(),
  }),
});

const DirectiveUsageObjectRemovedModel = implement<DirectiveUsageObjectRemovedChange>().with({
  type: DirectiveUsageObjectRemovedLiteral,
  meta: z.object({
    objectName: z.string(),
    removedDirectiveName: z.string(),
  }),
});

const DirectiveUsageInterfaceAddedModel = implement<DirectiveUsageInterfaceAddedChange>().with({
  type: DirectiveUsageInterfaceAddedLiteral,
  meta: z.object({
    interfaceName: z.string(),
    addedDirectiveName: z.string(),
  }),
});

const DirectiveUsageInterfaceRemovedModel = implement<DirectiveUsageInterfaceRemovedChange>().with({
  type: DirectiveUsageInterfaceRemovedLiteral,
  meta: z.object({
    interfaceName: z.string(),
    removedDirectiveName: z.string(),
  }),
});

const DirectiveUsageArgumentDefinitionAddedModel =
  implement<DirectiveUsageArgumentDefinitionAddedChange>().with({
    type: DirectiveUsageArgumentDefinitionAddedLiteral,
    meta: z.object({
      typeName: z.string(),
      fieldName: z.string(),
      argumentName: z.string(),
      addedDirectiveName: z.string(),
    }),
  });

const DirectiveUsageArgumentDefinitionRemovedModel =
  implement<DirectiveUsageArgumentDefinitionRemovedChange>().with({
    type: DirectiveUsageArgumentDefinitionRemovedLiteral,
    meta: z.object({
      typeName: z.string(),
      fieldName: z.string(),
      argumentName: z.string(),
      removedDirectiveName: z.string(),
    }),
  });

const DirectiveUsageSchemaAddedModel = implement<DirectiveUsageSchemaAddedChange>().with({
  type: DirectiveUsageSchemaAddedLiteral,
  meta: z.object({
    addedDirectiveName: z.string(),
    schemaTypeName: z.string(),
  }),
});

const DirectiveUsageSchemaRemovedModel = implement<DirectiveUsageSchemaRemovedChange>().with({
  type: DirectiveUsageSchemaRemovedLiteral,
  meta: z.object({
    removedDirectiveName: z.string(),
    schemaTypeName: z.string(),
  }),
});

const DirectiveUsageFieldDefinitionAddedModel =
  implement<DirectiveUsageFieldDefinitionAddedChange>().with({
    type: DirectiveUsageFieldDefinitionAddedLiteral,
    meta: z.object({
      typeName: z.string(),
      fieldName: z.string(),
      addedDirectiveName: z.string(),
    }),
  });

const DirectiveUsageFieldDefinitionRemovedModel =
  implement<DirectiveUsageFieldDefinitionRemovedChange>().with({
    type: DirectiveUsageFieldDefinitionRemovedLiteral,
    meta: z.object({
      typeName: z.string(),
      fieldName: z.string(),
      removedDirectiveName: z.string(),
    }),
  });

const DirectiveUsageUnionMemberAddedModel = implement<DirectiveUsageUnionMemberAddedChange>().with({
  type: DirectiveUsageUnionMemberAddedLiteral,
  meta: z.object({
    unionName: z.string(),
    addedDirectiveName: z.string(),
    addedUnionMemberTypeName: z.string(),
  }),
});

const DirectiveUsageUnionMemberRemovedModel =
  implement<DirectiveUsageUnionMemberRemovedChange>().with({
    type: DirectiveUsageUnionMemberRemovedLiteral,
    meta: z.object({
      unionName: z.string(),
      removedDirectiveName: z.string(),
      removedUnionMemberTypeName: z.string(),
    }),
  });

// TODO: figure out a way to make sure that all the changes are included in the union
// Similar to implement().with() but for unions
export const SchemaChangeModel = z.union([
  FieldArgumentDescriptionChangedModel,
  FieldArgumentDefaultChangedModel,
  FieldArgumentTypeChangedModel,
  DirectiveRemovedModel,
  DirectiveAddedModel,
  DirectiveDescriptionChangedModel,
  DirectiveLocationAddedModel,
  DirectiveLocationRemovedModel,
  DirectiveArgumentAddedModel,
  DirectiveArgumentRemovedModel,
  DirectiveArgumentDescriptionChangedModel,
  DirectiveArgumentDefaultValueChangedModel,
  DirectiveArgumentTypeChangedModel,
  EnumValueRemovedModel,
  EnumValueAdded,
  EnumValueDescriptionChangedModel,
  EnumValueDeprecationReasonChangedModel,
  EnumValueDeprecationReasonAddedModel,
  EnumValueDeprecationReasonRemovedModel,
  FieldRemovedModel,
  FieldAddedModel,
  FieldDescriptionChangedModel,
  FieldDescriptionAddedModel,
  FieldDescriptionRemovedModel,
  FieldDeprecationAddedModel,
  FieldDeprecationRemovedModel,
  FieldDeprecationReasonChangedModel,
  FieldDeprecationReasonAddedModel,
  FieldDeprecationReasonRemovedModel,
  FieldTypeChangedModel,
  FieldArgumentAddedModel,
  FieldArgumentRemovedModel,
  InputFieldRemovedModel,
  InputFieldAddedModel,
  InputFieldDescriptionAddedModel,
  InputFieldDescriptionRemovedModel,
  InputFieldDescriptionChangedModel,
  InputFieldDefaultValueChangedModel,
  InputFieldTypeChangedModel,
  ObjectTypeInterfaceAddedModel,
  ObjectTypeInterfaceRemovedModel,
  SchemaQueryTypeChangedModel,
  SchemaMutationTypeChangedModel,
  SchemaSubscriptionTypeChangedModel,
  TypeRemovedModel,
  TypeAddedModel,
  TypeKindChangedModel,
  TypeDescriptionChangedModel,
  TypeDescriptionAddedModel,
  TypeDescriptionRemovedModel,
  UnionMemberRemovedModel,
  UnionMemberAddedModel,
  // Hive Federation/Stitching Specific
  RegistryServiceUrlChangeModel,
  DirectiveUsageUnionMemberAddedModel,
  DirectiveUsageUnionMemberRemovedModel,
  DirectiveUsageEnumAddedModel,
  DirectiveUsageEnumRemovedModel,
  DirectiveUsageEnumValueAddedModel,
  DirectiveUsageEnumValueRemovedModel,
  DirectiveUsageInputObjectAddedModel,
  DirectiveUsageInputObjectRemovedModel,
  DirectiveUsageFieldAddedModel,
  DirectiveUsageFieldRemovedModel,
  DirectiveUsageScalarAddedModel,
  DirectiveUsageScalarRemovedModel,
  DirectiveUsageObjectAddedModel,
  DirectiveUsageObjectRemovedModel,
  DirectiveUsageInterfaceAddedModel,
  DirectiveUsageInterfaceRemovedModel,
  DirectiveUsageArgumentDefinitionAddedModel,
  DirectiveUsageArgumentDefinitionRemovedModel,
  DirectiveUsageSchemaAddedModel,
  DirectiveUsageSchemaRemovedModel,
  DirectiveUsageFieldDefinitionAddedModel,
  DirectiveUsageFieldDefinitionRemovedModel,
  DirectiveUsageInputFieldDefinitionAddedModel,
  DirectiveUsageInputFieldDefinitionRemovedModel,
]);

({}) as SerializableChange satisfies z.TypeOf<typeof SchemaChangeModel>;

export type Change = z.infer<typeof SchemaChangeModel>;

export const SchemaCompositionErrorModel = z.object({
  message: z.string(),
  source: z.union([z.literal('graphql'), z.literal('composition')]),
});

export type SchemaCompositionError = z.TypeOf<typeof SchemaCompositionErrorModel>;

export const SchemaPolicyWarningModel = z.object({
  message: z.string(),
  line: z.number().nullable().optional(),
  column: z.number().nullable().optional(),
  ruleId: z.string().nullable(),
  endLine: z.number().nullable().optional(),
  endColumn: z.number().nullable().optional(),
});

function createSchemaChangeId(change: { type: string; meta: Record<string, unknown> }): string {
  const hash = crypto.createHash('md5');
  hash.update(stableJSONStringify(change.meta));
  return hash.digest('hex');
}

const ApprovalMetadataModel = z.object({
  userId: z.string().uuid(),
  schemaCheckId: z.string(),
  date: z.string(),
});

export type SchemaCheckApprovalMetadata = z.TypeOf<typeof ApprovalMetadataModel>;

function isInputFieldAddedChange(change: Change): change is z.TypeOf<typeof InputFieldAddedModel> {
  return change.type === 'INPUT_FIELD_ADDED';
}

export const HiveSchemaChangeModel = z
  .intersection(
    SchemaChangeModel,
    z.object({
      /** optional property for identifying whether a change is safe based on the usage data. */
      isSafeBasedOnUsage: z.boolean().optional(),
      /** Optional id that uniquely identifies a change. The ID is generated in case the input does not contain it. */
      id: z.string().optional(),
      approvalMetadata: ApprovalMetadataModel.nullable()
        .optional()
        .transform(value => value ?? null),
      usageStatistics: z
        .object({
          topAffectedOperations: z.array(
            z.object({
              hash: z.string(),
              name: z.string(),
              count: z.number(),
            }),
          ),
          topAffectedClients: z.array(
            z.object({
              name: z.string(),
              count: z.number(),
            }),
          ),
        })
        .nullable()
        .optional()
        .transform(value => value ?? null),
    }),
  )
  // We inflate the schema check when reading it from the database
  // In order to keep TypeScript compiler from blowing up we use our own internal
  // type for the schema checks that is no exhaustive union.
  // We only do exhaustive json validation when reading from the database
  // to make sure there is no inconsistency between runtime types and database types.
  .transform(
    (
      rawChange,
    ): {
      readonly id: string;
      readonly type: string;
      readonly meta: Record<string, SerializableValue>;
      readonly criticality: CriticalityLevel;
      readonly reason: string | null;
      readonly message: string;
      readonly path: string | null;
      readonly approvalMetadata: SchemaCheckApprovalMetadata | null;
      isSafeBasedOnUsage: boolean;
      usageStatistics: {
        topAffectedOperations: { hash: string; name: string; count: number }[];
        topAffectedClients: { name: string; count: number }[];
      } | null;
      readonly breakingChangeSchemaCoordinate: string | null;
    } => {
      const change = schemaChangeFromSerializableChange(rawChange as any);

      /** The schema coordinate used for detecting whether something is a breaking change can be different based on the change type. */
      let breakingChangeSchemaCoordinate: string | null = null;

      if (change.criticality.level === CriticalityLevel.Breaking) {
        breakingChangeSchemaCoordinate = change.path ?? null;

        if (
          isInputFieldAddedChange(rawChange) &&
          rawChange.meta.isAddedInputFieldTypeNullable === false
        ) {
          breakingChangeSchemaCoordinate = rawChange.meta.inputName;
        }
      }

      return {
        get id() {
          return rawChange.id ?? createSchemaChangeId(change);
        },
        type: change.type,
        approvalMetadata: rawChange.approvalMetadata,
        criticality: change.criticality.level,
        message: change.message,
        meta: change.meta,
        path: change.path ?? null,
        isSafeBasedOnUsage:
          // only breaking changes can be safe based on usage
          (change.criticality.level === CriticalityLevel.Breaking &&
            rawChange.isSafeBasedOnUsage) ||
          false,
        reason: change.criticality.reason ?? null,
        usageStatistics: rawChange.usageStatistics ?? null,
        breakingChangeSchemaCoordinate,
      };
    },
  );

export type SchemaChangeType = z.TypeOf<typeof HiveSchemaChangeModel>;

// Schema Checks

const FailedSchemaCompositionOutputFields = {
  schemaCompositionErrors: z.array(SchemaCompositionErrorModel),
  compositeSchemaSDL: z.null(),
  supergraphSDL: z.null(),
};

const FailedSchemaCompositionInputFields = {
  ...FailedSchemaCompositionOutputFields,
};

const SuccessfulSchemaCompositionOutputFields = {
  schemaCompositionErrors: z.null(),
  compositeSchemaSDL: z.string(),
  supergraphSDL: z.string().nullable(),
};

const SuccessfulSchemaCompositionInputFields = {
  ...SuccessfulSchemaCompositionOutputFields,
};

const SchemaCheckSharedPolicyFields = {
  schemaPolicyWarnings: z.array(SchemaPolicyWarningModel).nullable(),
  schemaPolicyErrors: z.array(SchemaPolicyWarningModel).nullable(),
};

const SchemaCheckSharedChangesFields = {
  safeSchemaChanges: z.array(HiveSchemaChangeModel).nullable(),
  breakingSchemaChanges: z.array(HiveSchemaChangeModel).nullable(),
};

const ManuallyApprovedSchemaCheckFields = {
  isManuallyApproved: z.literal(true),
  manualApprovalUserId: z.string().nullable(),
  manualApprovalComment: z.string().nullable(),
};

const NotManuallyApprovedSchemaCheckFields = {
  isManuallyApproved: z.literal(false),
  manualApprovalUserId: z.null(),
};

const SchemaCheckSharedOutputFields = {
  schemaSDL: z.string(),
  serviceName: z.string().nullable(),
  targetId: z.string(),
  schemaVersionId: z.string().nullable(),
  meta: z
    .object({
      author: z.string(),
      commit: z.string(),
    })
    .nullable(),
  // github specific data
  githubCheckRunId: z.number().nullable(),
  // TODO: these two always come together
  // we need to improve the model code to reflect that
  githubRepository: z.string().nullable(),
  githubSha: z.string().nullable(),
  contextId: z.string().nullable(),
};

const SchemaCheckSharedInputFields = {
  ...SchemaCheckSharedOutputFields,
};

const ContractCheckInput = z.object({
  contractId: z.string(),
  comparedContractVersionId: z.string().uuid().nullable(),
  isSuccess: z.boolean(),
  compositeSchemaSdl: z.string().nullable(),
  supergraphSchemaSdl: z.string().nullable(),
  schemaCompositionErrors: z.array(SchemaCompositionErrorModel).nullable(),
  breakingSchemaChanges: z.array(HiveSchemaChangeModel).nullable(),
  safeSchemaChanges: z.array(HiveSchemaChangeModel).nullable(),
});

const DateOrString = z
  .union([z.date(), z.string()])
  .transform(value => (typeof value === 'string' ? new Date(value) : value));

export const ConditionalBreakingChangeMetadataModel = z.object({
  period: z.object({
    from: DateOrString,
    to: DateOrString,
  }),
  settings: z.object({
    retentionInDays: z.number(),
    percentage: z.number(),
    excludedClientNames: z.array(z.string()).nullable(),
    /** we keep both reference to id and name so in case target gets deleted we can still display the name */
    targets: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    ),
  }),
  usage: z.object({
    totalRequestCount: z.number(),
  }),
});

export type ConditionalBreakingChangeMetadata = z.TypeOf<
  typeof ConditionalBreakingChangeMetadataModel
>;

export const InsertConditionalBreakingChangeMetadataModel =
  ConditionalBreakingChangeMetadataModel.transform(data => ({
    ...data,
    period: {
      from: data.period.from.toISOString(),
      to: data.period.to.toISOString(),
    },
  })).nullable();

const SchemaCheckInputModel = z.union([
  z.intersection(
    z.object({
      isSuccess: z.literal(false),
      ...SchemaCheckSharedPolicyFields,
      ...SchemaCheckSharedChangesFields,
      ...NotManuallyApprovedSchemaCheckFields,
      ...SchemaCheckSharedInputFields,
      contracts: z.array(ContractCheckInput).nullable(),
      conditionalBreakingChangeMetadata: ConditionalBreakingChangeMetadataModel.nullable(),
    }),
    z.union([
      z.object(FailedSchemaCompositionInputFields),
      z.object(SuccessfulSchemaCompositionInputFields),
    ]),
  ),
  z.intersection(
    z.object({
      isSuccess: z.literal(true),
      ...SchemaCheckSharedPolicyFields,
      ...SchemaCheckSharedChangesFields,
      ...SuccessfulSchemaCompositionInputFields,
      ...SchemaCheckSharedInputFields,
      contracts: z.array(ContractCheckInput).nullable(),
      conditionalBreakingChangeMetadata: ConditionalBreakingChangeMetadataModel.nullable(),
    }),
    z.union([
      z.object({ ...ManuallyApprovedSchemaCheckFields }),
      z.object({ ...NotManuallyApprovedSchemaCheckFields }),
    ]),
  ),
]);

const PersistedSchemaCheckFields = {
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
};

export const SchemaCheckModel = z.union([
  z.intersection(
    z.object({
      isSuccess: z.literal(false),
      ...SchemaCheckSharedPolicyFields,
      ...SchemaCheckSharedChangesFields,
      ...PersistedSchemaCheckFields,
      ...NotManuallyApprovedSchemaCheckFields,
      ...SchemaCheckSharedOutputFields,
      conditionalBreakingChangeMetadata: ConditionalBreakingChangeMetadataModel.nullable(),
    }),
    z.union([
      z.object(FailedSchemaCompositionOutputFields),
      z.object(SuccessfulSchemaCompositionOutputFields),
    ]),
  ),
  z.intersection(
    z.object({
      isSuccess: z.literal(true),
      ...SchemaCheckSharedPolicyFields,
      ...SchemaCheckSharedChangesFields,
      ...SuccessfulSchemaCompositionOutputFields,
      ...PersistedSchemaCheckFields,
      ...SchemaCheckSharedOutputFields,
      conditionalBreakingChangeMetadata: ConditionalBreakingChangeMetadataModel.nullable(),
    }),
    z.union([
      z.object({ ...ManuallyApprovedSchemaCheckFields }),
      z.object({ ...NotManuallyApprovedSchemaCheckFields }),
    ]),
  ),
]);

export type SchemaCheckInput = z.TypeOf<typeof SchemaCheckInputModel>;
export type SchemaCheck = z.TypeOf<typeof SchemaCheckModel>;

export const TargetBreadcrumbModel = z
  .object({
    organization_slug: z.string(),
    project_slug: z.string(),
    target_slug: z.string(),
  })
  .transform(value => {
    return {
      organizationSlug: value.organization_slug,
      projectSlug: value.project_slug,
      targetSlug: value.target_slug,
    };
  });

export type TargetBreadcrumb = z.TypeOf<typeof TargetBreadcrumbModel>;
