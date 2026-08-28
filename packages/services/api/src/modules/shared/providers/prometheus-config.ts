import { Injectable, Scope } from 'graphql-modules';

/**
 * Raw BentoCache keys create a permanent Prometheus series per key. Grouping 100k unique keys
 * reduced series from 100k to 1, retained heap from 22.3MB to 0.05MB.
 */
export const PROMETHEUS_CACHE_KEY_GROUPS: Array<[RegExp, string]> = [[/^/, 'all']];

@Injectable({
  scope: Scope.Singleton,
})
export class PrometheusConfig {
  constructor(private _isEnabled = false) {}

  get isEnabled() {
    return this._isEnabled;
  }
}
