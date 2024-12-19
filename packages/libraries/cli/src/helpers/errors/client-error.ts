import { GraphQLError } from 'graphql';

export class ClientError extends Error {
  constructor(
    message: string,
    public response: {
      errors?: readonly GraphQLError[];
      headers: Headers;
    },
  ) {
    super(message);
  }
}
