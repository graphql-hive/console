import * as pulumi from '@pulumi/pulumi';
import { serviceLocalHost } from '../utils/local-endpoint';
import { Observability as ObservabilityInstance } from '../utils/observability';
import { Environment } from './environment';
import { deployGrafana } from './grafana';

// Change this to control OTEL tracing for usage service
const enableTracingForUsageService = true;

export function deployObservability(config: { environment: Environment }) {
  const observabilityConfig = new pulumi.Config('observability');

  if (!observabilityConfig.getBoolean('enabled')) {
    return {
      enabled: false,
    };
  }

  const useLocal = observabilityConfig.getBoolean('local');

  const observability = new ObservabilityInstance(
    config.environment,
    useLocal
      ? 'local'
      : {
          prom: {
            endpoint: observabilityConfig.require('promEndpoint'),
            username: observabilityConfig.require('promUsername'),
            password: observabilityConfig.requireSecret('promPassword'),
          },
          loki: {
            endpoint: observabilityConfig.require('lokiEndpoint'),
            username: observabilityConfig.require('lokiUsername'),
            password: observabilityConfig.requireSecret('lokiPassword'),
          },
          tempo: {
            endpoint: observabilityConfig.require('tempoEndpoint'),
            username: observabilityConfig.require('tempoUsername'),
            password: observabilityConfig.requireSecret('tempoPassword'),
          },
        },
  );

  const observabilityInstance = observability.deploy();

  if (!observabilityInstance.otlpCollectorService) {
    throw new Error('OTLP collector service is required for observability');
  }

  const tableSuffix =
    config.environment.envName === 'prod' ? 'production' : config.environment.envName;

  return {
    tracingEndpoint: serviceLocalHost(observabilityInstance.otlpCollectorService).apply(
      host => `http://${host}:4318/v1/traces`,
    ),
    observability: observabilityInstance,
    grafana: useLocal ? undefined : deployGrafana(config.environment.envName, tableSuffix),
    enabled: true,
    enabledForUsageService: enableTracingForUsageService,
  };
}

export type Observability = ReturnType<typeof deployObservability>;
