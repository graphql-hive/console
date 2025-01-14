import { Static, TOptional, TSchema } from '@sinclair/typebox';
import { TMappingType, TRecursiveMap } from './recursive-map';

export interface StaticDefaultMapping extends TMappingType {
  output: this['input'] extends TSchema // if input schematic contains an default
    ? this['input'] extends { default: unknown } // annotation, remap it to be optional,
      ? // ? TOptional<this['input']> // otherwise just return the schema as is.
        this['input']
      : this['input']
    : this['input'];
}
export type StaticDefault<Type extends TSchema> = Static<TRecursiveMap<Type, StaticDefaultMapping>>;
