import { createContext } from 'react';

export const ChangeRowContext = createContext({
  change: {
    addition: false,
    removal: false,
  },
  setAdded(_: boolean) {},
  setRemoved(_: boolean) {},
});
