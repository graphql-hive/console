import { Type } from '@sinclair/typebox';

export const StringNonEmpty = Type.String({ minLength: 1 });
