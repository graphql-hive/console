import type { GraphQLSchema } from 'graphql';
import { Injectable, Scope } from 'graphql-modules';
import type { Rule } from '@graphql-inspector/core';
import { traceFn } from '@hive/service-common';
import { Logger } from '../../shared/providers/logger';
import { diffSchemas } from '../lib/schema-diff';

@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class Inspector {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child({ service: 'Inspector' });
  }

  @traceFn('Inspector.diff', {
    resultAttributes: result => ({
      'hive.diff.changes.count': result.length,
    }),
  })
  async diff(existing: GraphQLSchema, incoming: GraphQLSchema, rules?: Rule[]) {
    this.logger.debug('Comparing Schemas');
    return diffSchemas(existing, incoming, rules);
  }
}
