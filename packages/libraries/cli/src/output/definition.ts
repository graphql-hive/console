import { Texture } from '../helpers/texture/texture';
import { T } from '../helpers/typebox/__';
import { Result } from './_';

type CommandInput = object;

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
     * A {@link Texture.Builder} instance provided to you for easily building your text.
     */
    texBuilder: Texture.Builder,
    /**
     * The data output by the command.
     */
    data: $Data,
    /**
     * The arguments passed to the command.
     *
     * The exact shape of this type must be cast by the user, if used.
     */
    input: CommandInput,
  ): void | string | Texture.Builder;
}

/**
 * Run and return the definition's text format.
 */
export const runText = (
  definition: Definition,
  commandInput: object,
  commandOutputData: object,
): string => {
  if (definition.text === undefined) return '';
  const textureBuilder = Texture.createBuilder();
  const textInit = definition.text(textureBuilder, commandOutputData, commandInput);
  const text =
    typeof textInit === 'string'
      ? textInit
      : textInit === undefined
        ? // User returned nothing, implying they are relying on Texture.Builder instance mutation.
          textureBuilder.state.value
        : // User explicitly returned a Texture.Builder instance.
          textInit.state.value;

  return text;
};

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
