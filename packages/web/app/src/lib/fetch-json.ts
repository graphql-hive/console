import { z } from 'zod';
import { Kit } from './kit';

export async function fetchJson<schema extends undefined | z.ZodType = undefined>(
  url: string,
  requestInit?: RequestInit,
  schema?: schema,
): Promise<
  (schema extends z.ZodType ? z.infer<schema> : Kit.Json.Value) | FetchJsonErrors.FetchJsonErrors
> {
  const response = await fetch(url, requestInit)
    // @see https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#exceptions
    .catch(Kit.oneOf(error => error instanceof TypeError || error instanceof DOMException));

  if (response instanceof TypeError) {
    return new FetchJsonErrors.FetchJsonRequestTypeError({ requestInit }, response);
  }

  if (response instanceof DOMException) {
    return new FetchJsonErrors.FetchJsonRequestNetworkError({}, response);
  }

  const json = await response
    .json()
    .then(value => value as Kit.Json.Value)
    // @see https://developer.mozilla.org/en-US/docs/Web/API/Response/json#exceptions
    .catch(
      Kit.oneOf(
        error =>
          error instanceof SyntaxError ||
          error instanceof TypeError ||
          error instanceof DOMException,
      ),
    );

  if (json instanceof DOMException) {
    return new FetchJsonErrors.FetchJsonRequestNetworkError({}, json);
  }

  if (json instanceof TypeError) {
    return new FetchJsonErrors.FetchJsonResponseTypeError({ response }, json);
  }

  if (json instanceof SyntaxError) {
    return new FetchJsonErrors.FetchJsonResponseSyntaxError({ response }, json);
  }

  if (schema) {
    const result = schema.safeParse(json);
    if (!result.success) {
      return new FetchJsonErrors.FetchJsonResponseSchemaError(
        { response, json, schema },
        result.error,
      );
    }
    return result.data as any; // z.infer<Exclude<schema, undefined>>;
  }

  return json as any; // Kit.Json.Value;
}

// =================================
// Error Classes
// =================================

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace FetchJsonErrors {
  export type FetchJsonErrors = FetchJsonResponseErrors | FetchJsonRequestErrors;

  // --------------------------------
  // Response Error Classes
  // --------------------------------

  export type FetchJsonRequestErrors = FetchJsonRequestTypeError | FetchJsonRequestNetworkError;

  export class FetchJsonRequestNetworkError extends Kit.Errors.ContextualError<
    'FetchJsonRequestNetworkError',
    {},
    DOMException
  > {
    message = 'Network failure.';
  }

  export class FetchJsonRequestTypeError extends Kit.Errors.ContextualError<
    'FetchJsonRequestTypeError',
    { requestInit?: RequestInit },
    TypeError
  > {
    message = 'Invalid request.';
  }

  // --------------------------------
  // Response Error Classes
  // --------------------------------

  export abstract class FetchJsonResponseError<
    $Name extends string,
    $Context extends {
      response: Response;
    },
    $Cause extends z.ZodError | SyntaxError | TypeError | DOMException,
  > extends Kit.Errors.ContextualError<$Name, $Context, $Cause> {
    message = 'Invalid response.';
  }

  export type FetchJsonResponseErrors =
    | FetchJsonResponseSyntaxError
    | FetchJsonResponseSchemaError
    | FetchJsonResponseTypeError;

  export class FetchJsonResponseTypeError extends FetchJsonResponseError<
    'FetchJsonResponseTypeError',
    { response: Response },
    TypeError
  > {
    message = 'Response is malformed.';
  }

  export class FetchJsonResponseSyntaxError extends FetchJsonResponseError<
    'FetchJsonResponseSyntaxError',
    { response: Response },
    SyntaxError
  > {
    message = 'Response body is not valid JSON.';
  }

  export class FetchJsonResponseSchemaError extends FetchJsonResponseError<
    'FetchJsonResponseSchemaError',
    { response: Response; json: Kit.Json.Value; schema: z.ZodType },
    z.ZodError
  > {
    message = 'Response body JSON violates the schema.';
  }
}
