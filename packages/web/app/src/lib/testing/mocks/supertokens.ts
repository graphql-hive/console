import type { ReactNode } from 'react';

/** Stand-in for `supertokens-auth-react`: nothing initializes, and the wrapper passes through. */
export default { init: () => {} };

export const SuperTokensWrapper = (props: { children: ReactNode }) => props.children;
