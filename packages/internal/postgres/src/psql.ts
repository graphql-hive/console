import { createSqlTag, QuerySqlToken, type SqlTag, type ValueExpression } from 'slonik';
import { z } from 'zod';
import { StandardSchemaV1 } from '@standard-schema/spec';

const tag = createSqlTag();

interface TemplateStringsArray extends ReadonlyArray<string> {
  readonly raw: readonly string[];
}

type CallableTag<
  T extends StandardSchemaV1<unknown, unknown> = StandardSchemaV1<unknown, unknown>,
> = (template: TemplateStringsArray, ...values: ValueExpression[]) => QuerySqlToken<T>;

export type TaggedTemplateLiteralInvocation = QuerySqlToken<any>;

function psqlFn(template: TemplateStringsArray, ...values: ValueExpression[]) {
  return tag.type(z.unknown())(template, ...values);
}

/**
 * Small helper utility for jsonifying a nullable object.
 */
function jsonbOrNull<T>(obj: T | null | undefined) {
  if (obj == null) return null;
  return psqlFn`${JSON.stringify(obj)}::jsonb`;
}

Object.assign(psqlFn, tag, {
  jsonbOrNull,
});

type UtilityExtensions = {
  jsonbOrNull: typeof jsonbOrNull;
};

export const psql = psqlFn as any as SqlTag<any> & CallableTag & UtilityExtensions;
