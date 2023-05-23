import { type Plugin } from 'graphql-yoga';
import { isGraphQLError } from '@envelop/core';
import { MapperKind, mapSchema } from '@graphql-tools/utils';

/**
 * Scalar serialization errors are swallowed by sentry in graphql-yoga, because they are GraphQLErrors and not Errors.
 * We can map them to normal errors in order to report them.
 *
 * See https://github.com/n1ru4l/envelop/issues/1808
 */
export function useUnexpectedSerializationError(): Plugin<any> {
  return {
    onSchemaChange({ schema, replaceSchema }) {
      if (schema.extensions?.[didApplyTransformSymbol]) {
        return;
      }

      const newSchema = mapSchema(schema, {
        [MapperKind.SCALAR_TYPE](scalarType) {
          const serialize = scalarType.serialize.bind(scalarType);
          scalarType.serialize = value => {
            try {
              return serialize(value);
            } catch (err) {
              if (isGraphQLError(err)) {
                throw new Error(err.message);
              }
              throw err;
            }
          };

          return scalarType;
        },
      });
      // @ts-expect-error GraphQLSchemaExtensions does not yet include symbol in its index signature
      newSchema.extensions[didApplyTransformSymbol] = true;
      replaceSchema(newSchema);
    },
  };
}

const didApplyTransformSymbol = Symbol('didApplyTransform');
