import { Texture } from '../helpers/texture/__';
import { T } from '../helpers/typebox/__';
import { Result } from './_';

export interface Definition<$Schema extends T.TObject = T.TObject> {
  schema: $Schema;
  text?: TextBuilder;
}

export const defineSuccess: DefinerForBase<typeof Result.SuccessBase> = (typeName, config) => {
  return {
    text: config.text,
    schema: T.Composite([
      Result.SuccessBase,
      T.Object({
        data: T.Composite([
          T.Object({ type: T.Literal(typeName, { default: typeName }) }),
          T.Object(config.data),
        ]),
      }),
    ]),
  } as any;
};

export const defineFailure: DefinerForBase<typeof Result.FailureBase> = (typeName, config) => {
  return {
    text: config.text,
    schema: T.Composite([
      Result.FailureBase,
      T.Object({
        data: T.Composite([
          T.Object({ type: T.Literal(typeName, { default: typeName }) }),
          T.Object(config.data),
        ]),
      }),
    ]),
  } as any;
};

export type DefinerForBase<$BaseT extends T.TObject> = <
  $DataT extends T.TProperties,
  $TypeName extends string,
  $OutputT extends T.TObject = T.TComposite<
    [
      $BaseT,
      T.TObject<{
        data: T.TComposite<
          [T.TObject<{ type: T.TLiteral<$TypeName> }>, T.TObject<NoInfer<$DataT>>]
        >;
      }>,
    ]
  >,
>(
  typeName: $TypeName,
  config: {
    /**
     * The schema for this data type.
     */
    data: $DataT;
    /**
     * An optional function used to create a string to be displayed to the user
     * whenever this data type is output by a command.
     *
     * @returns
     *
     * 1. You may return a string
     * 2. You may return a {@link Texture.Builder} (tip: use the one given, third parameter).
     * 3. You may return nothing. In this case the the string state of the given text builder is used.
     *
     * Tip: If you want a declarative logging-like experience use the given {@link Texture.Builder} and
     * don't return anything.
     *
     * Note: If user invoked the CLI with --json, then the output from this function is ignored.
     */
    text?: TextBuilder<T.Static<$OutputT>['data']>;
  },
) => Definition<$OutputT>;

interface TextBuilder<$Data = any> {
  (
    /**
     * The arguments passed to the command.
     */
    input: {
      /**
       * The flag arguments passed to the command.
       */
      flags: any;
      /**
       * The positional arguments passed to the command.
       */
      args: any;
    },
    /**
     * The data output by the command.
     */
    data: $Data,
    /**
     * A {@link Texture.Builder} instance provided to you for easily building your text.
     */
    texBuilder: Texture.Builder,
  ): void | string | Texture.Builder;
}

export type InferSuccessResultInit<$DataType extends Definition> = Result.InferSuccessInit<
  $DataType['schema']
>;

export type InferSuccessResult<$DataType extends Definition> = Result.InferSuccess<
  $DataType['schema']
>;

export type InferFailureResultInit<$DataType extends Definition> = Result.InferFailureInit<
  $DataType['schema']
>;

export type InferFailureResult<$DataType extends Definition> = Result.InferFailure<
  $DataType['schema']
>;
