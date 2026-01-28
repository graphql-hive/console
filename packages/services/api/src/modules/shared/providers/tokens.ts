import { InjectionToken } from 'graphql-modules';

export const WEB_APP_URL = new InjectionToken<string>('WEB_APP_URL');
export const FORWARDED_IP_HEADER_NAME = new InjectionToken<string>('FORWARDED_IP_HEADER_NAME');
