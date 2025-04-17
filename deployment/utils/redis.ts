import * as k8s from '@pulumi/kubernetes';
import * as kx from '@pulumi/kubernetesx';
import { Output } from '@pulumi/pulumi';
import { memoryParser } from './k8s';
import { getLocalComposeConfig } from './local-config';
import { normalizeEnv, PodBuilder } from './pod-builder';

const REDIS_PORT = 6379;
const METRICS_PORT = 9121;
const REDIS_EXPORTER_IMAGE = 'oliver006/redis_exporter:v1.70.0-alpine';

export class Redis {
  constructor(
    protected options: {
      env?: kx.types.Container['env'];
      password: Output<string>;
    },
  ) {}

  deploy(input: { limits: { memory: string; cpu: string } }) {
    const redisService = getLocalComposeConfig().service('redis');
    const name = 'redis-store';
    const limits: k8s.types.input.core.v1.ResourceRequirements['limits'] = {
      memory: input.limits.memory,
      cpu: input.limits.cpu,
    };

    const env: k8s.types.input.core.v1.EnvVar[] = normalizeEnv(this.options.env ?? {}).concat([
      {
        name: 'REDIS_PASSWORD',
        value: this.options.password,
      },
      {
        name: 'POD_NAME',
        valueFrom: {
          fieldRef: {
            fieldPath: 'metadata.name',
          },
        },
      },
    ] satisfies k8s.types.input.core.v1.EnvVar[]);

    const cm = new kx.ConfigMap('redis-scripts', {
      data: {
        'readiness.sh': this.options.password.apply(
          p => `#!/bin/bash
        response=$(timeout -s SIGTERM 3 $1 redis-cli -h localhost -a ${p} -p ${REDIS_PORT} ping)
        if [ "$response" != "PONG" ]; then
          echo "$response"
          exit 1
        fi
                `,
        ),
        'liveness.sh': this.options.password.apply(
          p => `#!/bin/bash
        response=$(timeout -s SIGTERM 3 $1 redis-cli -h localhost -a ${p} -p ${REDIS_PORT} ping)
        if [ "$response" != "PONG" ] && [ "$response" != "LOADING Redis is loading the dataset in memory" ]; then
          echo "$response"
          exit 1
        fi
                `,
        ),
      },
    });

    const volumeMounts = [cm.mount('/scripts')];

    // Redis Exporter container environment variables
    const exporterEnv: k8s.types.input.core.v1.EnvVar[] = [
      {
        name: 'REDIS_ADDR',
        value: `redis://localhost:${REDIS_PORT}`,
      },
      {
        name: 'REDIS_PASSWORD',
        value: this.options.password,
      },
      {
        name: 'REDIS_EXPORTER_LOG_FORMAT',
        value: 'json',
      },
    ];

    const memoryInBytes = memoryParser(input.limits.memory) * 0.9; // Redis recommends 80%
    const memoryInMegabytes = Math.floor(memoryInBytes / 1024 / 1024);

    const pb = new PodBuilder({
      restartPolicy: 'Always',
      containers: [
        {
          name,
          image: redisService.image,
          env,
          volumeMounts,
          ports: [{ containerPort: REDIS_PORT, protocol: 'TCP' }],
          resources: {
            limits,
          },
          livenessProbe: {
            initialDelaySeconds: 3,
            periodSeconds: 10,
            failureThreshold: 10,
            timeoutSeconds: 3,
            exec: {
              command: ['/bin/sh', '/scripts/liveness.sh'],
            },
          },
          // Note: this is needed, otherwise local config is not loaded at all
          command: ['/opt/bitnami/scripts/redis/entrypoint.sh'],
          // This is where we can pass actual flags to the bitnami/redis runtime
          args: ['/opt/bitnami/scripts/redis/run.sh', `--maxmemory ${memoryInMegabytes}mb`],
          readinessProbe: {
            initialDelaySeconds: 5,
            periodSeconds: 8,
            failureThreshold: 5,
            timeoutSeconds: 3,
            exec: {
              command: ['/bin/sh', '/scripts/readiness.sh'],
            },
          },
        },
        {
          name: 'redis-exporter',
          image: REDIS_EXPORTER_IMAGE,
          env: exporterEnv,
          ports: [{ containerPort: METRICS_PORT, protocol: 'TCP', name: 'metrics' }],
          resources: {
            limits: {
              cpu: '200m',
              memory: '200Mi',
            },
          },
        },
      ],
    });

    const deployment = new kx.Deployment(name, {
      spec: pb.asExtendedDeploymentSpec(
        {
          replicas: 1,
          strategy: {
            type: 'RollingUpdate',
            rollingUpdate: {
              maxSurge: 1,
              maxUnavailable: 0,
            },
          },
        },
        {
          annotations: {
            'prometheus.io/scrape': 'true',
            'prometheus.io/port': String(METRICS_PORT),
            'prometheus.io/path': '/metrics',
          },
        },
      ),
    });

    new k8s.policy.v1.PodDisruptionBudget('redis-pdb', {
      spec: {
        minAvailable: 1,
        selector: deployment.spec.selector,
      },
    });

    const service = deployment.createService({});

    return { deployment, service, redisPort: REDIS_PORT, metricsPort: METRICS_PORT };
  }
}
