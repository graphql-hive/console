/**
 * This code was copied from the Typebox repository.
 * @see https://github.com/sinclairzx81/typebox/issues/1134#issuecomment-2589589495
 * @see https://github.com/sinclairzx81/typebox/blob/master/example/prototypes/options.ts
 */

/*--------------------------------------------------------------------------

@sinclair/typebox/prototypes

The MIT License (MIT)

Copyright (c) 2017-2024 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

import { CloneType, TSchema } from '@sinclair/typebox';

// prettier-ignore
export type TOptions<Type extends TSchema, Options extends Record<PropertyKey, unknown>> = (
  Type & Options
)

/** `[Prototype]` Augments a schema with additional generics aware properties */
// prettier-ignore
export function Options<Type extends TSchema, Options extends Record<PropertyKey, unknown>>(type: Type, options: Options): TOptions<Type, Options> {
  return CloneType(type, options) as never
}
