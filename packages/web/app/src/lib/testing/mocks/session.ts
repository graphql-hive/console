import type { ReactNode } from 'react';

/** Stand-in for `supertokens-auth-react/recipe/session`: a signed-in session that never refreshes. */
export default {
  init: () => {},
  doesSessionExist: async () => true,
  getAccessTokenPayloadSecurely: async () => ({
    superTokensUserId: 'user-1',
    email: 'user@the-guild.dev',
  }),
  attemptRefreshingSession: async () => true,
  signOut: async () => {},
};

export const SessionAuth = (props: { children: ReactNode }) => props.children;

export const useSessionContext = () => ({
  loading: false,
  doesSessionExist: true,
  userId: 'user-1',
});
