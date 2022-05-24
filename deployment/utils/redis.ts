import * as kx from '@pulumi/kubernetesx';
import * as k8s from '@pulumi/kubernetes';
import { normalizeEnv, PodBuilder } from './pod-builder';

const DEFAULT_IMAGE = 'bitnami/redis:6.2.6';
const PORT = 6379;

export class Redis {
  constructor(
    protected options: {
      env?: kx.types.Container['env'];
      password: string;
    }
  ) {}

  deploy({ limits }: { limits: k8s.types.input.core.v1.ResourceRequirements['limits'] }) {
    const name = 'redis-store';
    const image = DEFAULT_IMAGE;

    const env = normalizeEnv(this.options.env ?? {}).concat([
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
    ]);

    const cm = new kx.ConfigMap('redis-scripts', {
      data: {
        'readiness.sh': `#!/bin/bash
response=$(timeout -s SIGTERM 3 $1 redis-cli -h localhost -a ${this.options.password} -p ${PORT} ping)
if [ "$response" != "PONG" ]; then
  echo "$response"
  exit 1
fi
        `,
        'liveness.sh': `#!/bin/bash
response=$(timeout -s SIGTERM 3 $1 redis-cli -h localhost -a ${this.options.password} -p ${PORT} ping)
if [ "$response" != "PONG" ] && [ "$response" != "LOADING Redis is loading the dataset in memory" ]; then
  echo "$response"
  exit 1
fi
        `,
      },
    });

    const volumeMounts = [cm.mount('/scripts')];

    const pb = new PodBuilder({
      restartPolicy: 'Always',
      containers: [
        {
          name,
          image,
          env,
          volumeMounts,
          ports: [{ containerPort: PORT, hostPort: PORT, protocol: 'TCP' }],
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
      ],
    });

    const metadata: k8s.types.input.meta.v1.ObjectMeta = {
      annotations: {},
    };

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
          annotations: metadata.annotations,
        }
      ),
    });
    const service = deployment.createService({});

    return { deployment, service, port: PORT };
  }
}
