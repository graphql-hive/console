export function cleanRequestId(requestId?: string | string[] | null): string | undefined {
  if (requestId) {
    if (Array.isArray(requestId)) {
      return cleanRequestId(requestId[0]);
    }

    return requestId.split(',')[0].trim();
  }
}

const prefix = 'Invariant failed';

// Throw an error if the condition fails
// > Not providing an inline default argument for message as the result is smaller
export function invariant(
  condition: unknown,
  // Can provide a string, or a function that returns a string for cases where
  // the message takes a fair amount of effort to compute
  message?: string | (() => string),
): asserts condition {
  if (condition) {
    return;
  }
  // Condition not passed

  // We allow the message to pass through
  const provided: string | undefined = typeof message === 'function' ? message() : message;

  // Options:
  // 1. message provided: `${prefix}: ${provided}`
  // 2. message not provided: prefix
  const value: string = provided ? `${prefix}: ${provided}` : prefix;
  throw new Error(value);
}

export function maskToken(token: string): string {
  if (token.length <= 5) {
    return '*'.repeat(token.length - 1) + token[token.length - 1];
  }
  return token.substring(0, 3) + '*'.repeat(token.length - 6) + token.substring(token.length - 3);
}
