import type { TokenResolvers } from './../../../__generated__/types';

export const Token: TokenResolvers = {
  id(token) {
    return token.token;
  },
  alias(token) {
    return token.tokenAlias;
  },
};
