import { FormatRegistry, SchemaOptions, TSchema, Type } from '@sinclair/typebox';

export const Nullable = <T extends TSchema>(schema: T, schemaOptions?: SchemaOptions) =>
  Type.Union([schema, Type.Null()], schemaOptions);
