import * as k8s from '@pulumi/kubernetes';
import { Output, interpolate } from '@pulumi/pulumi';

export type ObservabilityConfig = {
  loki: {
    endpoint: Output<string> | string;
    username: Output<string> | string;
    password: Output<string>;
  };
  prom: {
    endpoint: Output<string> | string;
    username: Output<string> | string;
    password: Output<string>;
  };
};
export class Observability {
  constructor(private envName: string, private config: ObservabilityConfig) {}

  deploy() {
    const ns = new k8s.core.v1.Namespace('observability', {
      metadata: {
        name: 'observability',
      },
    });

    // We are using otel-collector to scrape metrics from Pods
    // dotansimha: once Vector supports scraping K8s metrics based on Prom, we can drop this.
    new k8s.helm.v3.Chart('metrics', {
      chart: 'opentelemetry-collector',
      namespace: ns.metadata.name,
      version: '0.17.0',
      fetchOpts: {
        repo: 'https://open-telemetry.github.io/opentelemetry-helm-charts',
      },
      // https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/values.yaml
      values: {
        agentCollector: {
          enabled: false,
        },
        standaloneCollector: {
          enabled: true,
          resources: {
            limits: {
              cpu: '256m',
              memory: '512Mi',
            },
          },
        },
        clusterRole: {
          create: true,
          rules: [
            {
              apiGroups: [''],
              resources: [
                'events',
                'namespaces',
                'namespaces/status',
                'nodes',
                'nodes/spec',
                'pods',
                'pods/metrics',
                'nodes/metrics',
                'pods/status',
                'replicationcontrollers',
                'replicationcontrollers/status',
                'resourcequotas',
                'services',
                'endpoints',
              ],
              verbs: ['get', 'list', 'watch'],
            },
            {
              apiGroups: ['apps'],
              resources: ['daemonsets', 'deployments', 'replicasets', 'statefulsets'],
              verbs: ['get', 'list', 'watch'],
            },
            {
              apiGroups: ['extensions'],
              resources: ['daemonsets', 'deployments', 'replicasets'],
              verbs: ['get', 'list', 'watch'],
            },
            {
              apiGroups: ['batch'],
              resources: ['jobs', 'cronjobs'],
              verbs: ['get', 'list', 'watch'],
            },
            {
              apiGroups: ['autoscaling'],
              resources: ['horizontalpodautoscalers'],
              verbs: ['get', 'list', 'watch'],
            },
          ],
        },
        config: {
          exporters: {
            logging: {
              loglevel: 'info',
            },
            prometheusremotewrite: {
              endpoint: interpolate`https://${this.config.prom.username}:${this.config.prom.password}@${this.config.prom.endpoint}`,
            },
          },
          extensions: {
            health_check: {},
          },
          processors: {
            batch: {},
            memory_limiter: {
              check_interval: '5s',
              limit_mib: 409,
              spike_limit_mib: 128,
            },
          },
          receivers: {
            prometheus: {
              config: {
                global: {
                  evaluation_interval: '10s',
                  scrape_interval: '30s',
                  scrape_timeout: '10s',
                },
                scrape_configs: [
                  // {
                  //   job_name: 'ingress-contour-endpoints',
                  //   kubernetes_sd_configs: [
                  //     {
                  //       role: 'pod',
                  //       namespaces: {
                  //         names: ['contour'],
                  //       },
                  //     },
                  //   ],
                  //   relabel_configs: [
                  //     {
                  //       source_labels: [
                  //         '__meta_kubernetes_pod_container_port_name',
                  //       ],
                  //       action: 'keep',
                  //       regex: 'metrics',
                  //     },
                  //     {
                  //       source_labels: [
                  //         '__meta_kubernetes_pod_annotation_prometheus_io_scrape',
                  //       ],
                  //       action: 'keep',
                  //       regex: true,
                  //     },
                  //     {
                  //       source_labels: [
                  //         '__meta_kubernetes_pod_annotation_prometheus_io_scheme',
                  //       ],
                  //       action: 'replace',
                  //       target_label: '__scheme__',
                  //       regex: '(https?)',
                  //     },
                  //     {
                  //       source_labels: [
                  //         '__meta_kubernetes_pod_annotation_prometheus_io_path',
                  //       ],
                  //       action: 'replace',
                  //       target_label: '__metrics_path__',
                  //       regex: '(.+)',
                  //     },
                  //     {
                  //       source_labels: [
                  //         '__address__',
                  //         '__meta_kubernetes_pod_annotation_prometheus_io_port',
                  //       ],
                  //       action: 'replace',
                  //       regex: '([^:]+)(?::d+)?;(d+)',
                  //       replacement: '$1:$2',
                  //       target_label: '__address__',
                  //     },
                  //   ],
                  // },
                  {
                    honor_labels: true,
                    honor_timestamps: true,
                    job_name: 'service-metrics',
                    kubernetes_sd_configs: [
                      {
                        role: 'pod',
                        namespaces: {
                          names: ['default'],
                        },
                      },
                    ],
                    metrics_path: '/metrics',
                    relabel_configs: [
                      {
                        source_labels: ['__meta_kubernetes_pod_container_port_name'],
                        action: 'keep',
                        regex: 'metrics',
                      },
                      {
                        source_labels: ['__meta_kubernetes_pod_annotation_prometheus_io_scrape'],
                        action: 'keep',
                        regex: true,
                      },
                      {
                        source_labels: ['__meta_kubernetes_pod_annotation_prometheus_io_scheme'],
                        action: 'replace',
                        target_label: '__scheme__',
                        regex: '(https?)',
                      },
                      {
                        source_labels: ['__meta_kubernetes_pod_annotation_prometheus_io_path'],
                        action: 'replace',
                        target_label: '__metrics_path__',
                        regex: '(.+)',
                      },
                      {
                        source_labels: ['__address__', '__meta_kubernetes_pod_annotation_prometheus_io_port'],
                        action: 'replace',
                        regex: '([^:]+)(?::d+)?;(d+)',
                        replacement: '$1:$2',
                        target_label: '__address__',
                      },
                      {
                        action: 'labelmap',
                        regex: '__meta_kubernetes_service_label_(.+)',
                      },
                      {
                        action: 'replace',
                        source_labels: ['__meta_kubernetes_namespace'],
                        target_label: 'namespace',
                      },
                      {
                        action: 'replace',
                        source_labels: ['__meta_kubernetes_service_name'],
                        target_label: 'service',
                      },
                      {
                        action: 'replace',
                        source_labels: ['__meta_kubernetes_pod_name'],
                        target_label: 'pod',
                      },
                      {
                        action: 'replace',
                        source_labels: ['__meta_kubernetes_pod_node_name'],
                        target_label: 'kubernetes_node',
                      },
                    ],
                    scheme: 'http',
                  },
                  // {
                  //   bearer_token_file:
                  //     '/var/run/secrets/kubernetes.io/serviceaccount/token',
                  //   job_name: 'kubernetes-cadvisor',
                  //   kubernetes_sd_configs: [
                  //     {
                  //       role: 'node',
                  //     },
                  //   ],
                  //   metrics_path: '/metrics/cadvisor',
                  //   relabel_configs: [
                  //     {
                  //       action: 'labelmap',
                  //       regex: '__meta_kubernetes_node_label_(.+)',
                  //     },
                  //   ],
                  //   scheme: 'https',
                  //   tls_config: {
                  //     ca_file:
                  //       '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
                  //     insecure_skip_verify: true,
                  //   },
                  // },
                ],
              },
            },
          },
          service: {
            extensions: ['health_check'],
            pipelines: {
              metrics: {
                exporters: ['logging', 'prometheusremotewrite'],
                processors: ['memory_limiter', 'batch'],
                receivers: ['prometheus'],
              },
            },
          },
        },
      },
    });

    // We are using Vector to scrape logs from the K8s Pods, and send it to Grafana Cloud
    new k8s.helm.v3.Chart(
      'vector-logging',
      {
        chart: 'vector',
        version: '0.10.3',
        namespace: ns.metadata.name,
        fetchOpts: {
          repo: 'https://helm.vector.dev',
        },
        // https://vector.dev/docs/reference/configuration/
        values: {
          role: 'Agent',
          customConfig: {
            data_dir: '/vector-data-dir',
            api: {
              enabled: true,
              playground: false,
              address: '127.0.0.1:7676',
            },
            sources: {
              kubernetes_logs: {
                type: 'kubernetes_logs',
                extra_field_selector: 'metadata.namespace=default',
              },
            },
            sinks: {
              // enable if you need to debug the raw vector messages
              // stdout: {
              //   type: 'console',
              //   inputs: ['kubernetes_logs'],
              //   encoding: { codec: 'json' },
              // },
              grafana_lab: {
                type: 'loki',
                inputs: ['kubernetes_logs'],
                endpoint: interpolate`https://${this.config.loki.endpoint}`,
                auth: {
                  strategy: 'basic',
                  user: this.config.loki.username,
                  password: this.config.loki.password,
                },
                labels: {
                  namespace: '{{`{{ kubernetes.pod_namespace }}`}}',
                  container_name: '{{`{{ kubernetes.container_name }}`}}',
                  env: this.envName,
                },
                encoding: {
                  codec: 'text',
                },
              },
            },
          },
        },
      },
      {
        dependsOn: [ns],
      }
    );
  }
}
