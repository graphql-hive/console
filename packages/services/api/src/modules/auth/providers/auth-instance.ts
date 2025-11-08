import { InjectionToken, ValueProvider } from 'graphql-modules';
import type { AuthInstance } from '../../../../../server/src/auth';

export type { AuthInstance };
export const AUTH_INSTANCE = new InjectionToken<AuthInstance>('auth-instance');

export function provideAuthInstance(instance: AuthInstance): ValueProvider<AuthInstance> {
  return {
    provide: AUTH_INSTANCE,
    useValue: instance,
  };
}
