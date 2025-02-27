import type { FastifyInstance } from 'fastify';

export function createOtelAuthEndpoint(server: FastifyInstance) {
  server.get('/otel-auth', (req, res) => {
    const authHeader = req.headers.authorization;
    const targetRefHeader = req.headers['x-hive-target-ref'];
    req.log.info('request! ' + authHeader);

    if (authHeader === 'Bearer 123') {
      if (targetRefHeader !== 'target-1') {
        // No access to target-1
        res.status(403).send({
          message: 'Forbidden access to the target',
        });
        return;
      }

      res.status(200).send({
        message: 'Authenticated',
        targetId: targetRefHeader,
      });
    } else {
      res.status(401).send({
        message: 'Unauthorized',
      });
    }
  });
}
