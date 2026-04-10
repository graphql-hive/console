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

Object.assign(psqlFn, createSqlTag());

export const psql = psqlFn as any as SqlTag<any> & CallableTag;
