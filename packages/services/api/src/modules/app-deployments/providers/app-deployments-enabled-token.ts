import { InjectionToken } from 'graphql-modules';

export const APP_DEPLOYMENTS_ENABLED = new InjectionToken<boolean>('APP_DEPLOYMENTS_ENABLED');
export const APP_DEPLOYMENT_TIMINGS_ENABLED = new InjectionToken<boolean>(
  'APP_DEPLOYMENT_TIMINGS_ENABLED',
);
