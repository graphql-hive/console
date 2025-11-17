import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { Environment } from './environment';

export type Redpanda = ReturnType<typeof deployRedpanda>;

export function deployRedpanda(args: { environment: Environment }) {
  const labels = { app: 'redpanda' };

  // StatefulSet for Redpanda
  const statefulSet = new k8s.apps.v1.StatefulSet('redpanda', {
    metadata: {
      name: 'redpanda',
    },
    spec: {
      serviceName: 'redpanda',
      replicas: args.environment.podsConfig.redpanda.replicas,
      selector: {
        matchLabels: labels,
      },
      template: {
        metadata: {
          labels,
        },
        spec: {
          containers: [
            {
              name: 'redpanda',
              image: 'redpandadata/redpanda:v25.3.1',
              resources: {
                limits: {
                  cpu: args.environment.podsConfig.redpanda.cpuLimit,
                  memory: args.environment.podsConfig.redpanda.memoryLimit,
                },
              },
              args: [
                'redpanda',
                'start',
                '--smp',
                '1',
                '--kafka-addr',
                'PLAINTEXT://0.0.0.0:9092',
                '--advertise-kafka-addr',
                pulumi.interpolate`PLAINTEXT://\${HOSTNAME}.redpanda.default.svc.cluster.local:9092`,
              ],
              ports: [
                { containerPort: 9092, name: 'kafka' },
                { containerPort: 8082, name: 'http' },
                { containerPort: 33145, name: 'rpc' },
                { containerPort: 9644, name: 'admin' },
              ],
              volumeMounts: [
                {
                  name: 'datadir',
                  mountPath: '/var/lib/redpanda/data',
                },
              ],
              livenessProbe: {
                httpGet: {
                  path: '/ready',
                  port: 9644,
                },
                initialDelaySeconds: 10,
                terminationGracePeriodSeconds: 60,
                periodSeconds: 10,
                failureThreshold: 5,
                timeoutSeconds: 5,
              },
              readinessProbe: {
                httpGet: {
                  path: '/ready',
                  port: 9644,
                },
                initialDelaySeconds: 10,
                periodSeconds: 15,
                failureThreshold: 5,
                timeoutSeconds: 5,
              },
            },
          ],
        },
      },
      volumeClaimTemplates: [
        {
          metadata: {
            name: 'datadir',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: args.environment.podsConfig.redpanda.storageSize,
              },
            },
          },
        },
      ],
    },
  });

  // Headless Service for StatefulSet (used for internal cluster communication)
  const headlessService = new k8s.core.v1.Service('redpanda-headless', {
    metadata: {
      name: 'redpanda',
    },
    spec: {
      clusterIP: 'None',
      selector: labels,
      ports: [
        { name: 'kafka', port: 9092, targetPort: 9092 },
        { name: 'http', port: 8082, targetPort: 8082 },
        { name: 'rpc', port: 33145, targetPort: 33145 },
        { name: 'admin', port: 9644, targetPort: 9644 },
      ],
    },
  });

  // ClusterIP Service for clients (load balances across all pods)
  const clientService = new k8s.core.v1.Service('redpanda-client-service', {
    metadata: {
      name: 'redpanda-client',
    },
    spec: {
      type: 'ClusterIP',
      selector: labels,
      ports: [
        { name: 'kafka', port: 9092, targetPort: 9092 },
        { name: 'http', port: 8082, targetPort: 8082 },
      ],
    },
  });

  // Create otel-traces topic
  const topicCreationJob = new k8s.batch.v1.Job(
    'redpanda-topic-creation',
    {
      metadata: {
        name: 'redpanda-topic-creation',
      },
      spec: {
        template: {
          spec: {
            restartPolicy: 'OnFailure',
            containers: [
              {
                name: 'rpk',
                image: 'redpandadata/redpanda:v25.3.1',
                imagePullPolicy: 'Always',
                command: [
                  '/bin/bash',
                  '-c',
                  `
                # Wait for Redpanda to be ready
                for i in {1..60}; do
                  if rpk cluster health --brokers redpanda-0.redpanda:9092 2>/dev/null | grep -q 'Healthy'; then
                    echo "Redpanda cluster is ready"
                    break
                  fi
                  echo "Waiting for Redpanda cluster... ($i/60)"
                  sleep 5
                done

                # Create topic with partitioning only (no replication)
                rpk topic create otel-traces \\
                  --brokers redpanda-0.redpanda:9092 \\
                  --replicas 1 \\
                  --partitions 10 \\
                  --config retention.ms=2592000000 \\
                  --config compression.type=snappy \\
                  --config max.message.bytes=10485760 \\
                  || echo "Topic may already exist"

                # Verify topic creation
                rpk topic describe otel-traces --brokers redpanda-0.redpanda:9092
                `,
                ],
              },
            ],
          },
        },
      },
    },
    { dependsOn: [statefulSet, headlessService] },
  );

  return {
    statefulSet,
    headlessService,
    clientService,
    topicCreationJob,
    // Client service endpoint - auto-discovers all brokers
    brokerEndpoint: 'redpanda-client:9092',
  };
}
