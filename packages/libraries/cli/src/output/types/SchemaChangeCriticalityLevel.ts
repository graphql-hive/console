import { T } from '../../helpers/typebox/__';

export const schemaChangeCriticalityLevel = {
  Breaking: 'Breaking',
  Dangerous: 'Dangerous',
  Safe: 'Safe',
} as const;

export type SchemaChangeCriticalityLevel = keyof typeof schemaChangeCriticalityLevel;

export const SchemaChangeCriticalityLevel = T.Enum(schemaChangeCriticalityLevel);
