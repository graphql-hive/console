import { SchemaHive } from '../../helpers/schema';
import { T } from '../../helpers/typebox/__';

export const AppDeploymentStatus = T.Enum({
  active: SchemaHive.AppDeploymentStatus.Active,
  pending: SchemaHive.AppDeploymentStatus.Pending,
  retired: SchemaHive.AppDeploymentStatus.Retired,
});

export type AppDeploymentStatus = T.Static<typeof AppDeploymentStatus>;
