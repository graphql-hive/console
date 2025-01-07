import { T } from '../../helpers/typebox/__';

export const OutputToFile = T.Object({
  path: T.String(),
  bytes: T.Number(),
});
