import { Injectable, Scope } from 'graphql-modules';

@Injectable({
  scope: Scope.Singleton,
})
export class PrometheusConfig {
  constructor(private _isEnabled = false) {}

  get isEnabled() {
    return this._isEnabled;
  }
}
