import type { FastifyReply, FastifyRequest } from 'fastify';

export interface Context {
  req: FastifyRequest;
  reply: FastifyReply;
}
