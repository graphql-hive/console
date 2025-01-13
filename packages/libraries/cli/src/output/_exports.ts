import { Definition as DefinitionT } from './definition';

export type Definition = DefinitionT;

export * as Case from './case-definition';
export * as Definition from './definition';
export * from './result';

export { defineCaseFailure, defineCaseSuccess } from './case-definition';
export { define } from './definition';
