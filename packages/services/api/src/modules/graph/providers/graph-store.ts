import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql, type CommonQueryMethods } from '@hive/postgres';
import { Logger } from '../../shared/providers/logger';

const ContractGraphConfigModel = z.object({
  includeTags: z.array(z.string()).nullable(),
  excludeTags: z.array(z.string()).nullable(),
  removeUnreachableTypesFromPublicApiSchema: z.boolean(),
  isDisabled: z.boolean(),
});

const GraphSharedModel = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
  targetId: z.string(),
  name: z.string(),
  isBackfilled: z.boolean(),
  createdAt: z.string(),
});

const BaseGraphModel = GraphSharedModel.extend({
  type: z.literal('BASE'),
  config: z.null(),
  sourceGraphId: z.null(),
});

type BaseGraph = z.TypeOf<typeof BaseGraphModel>;

const ContractGraphModel = GraphSharedModel.extend({
  type: z.literal('CONTRACT'),
  config: ContractGraphConfigModel,
  sourceGraphId: z.string(),
});

type ContractGraph = z.TypeOf<typeof ContractGraphModel>;

const GraphModel = z.discriminatedUnion('type', [BaseGraphModel, ContractGraphModel]);

export type Graph = z.infer<typeof GraphModel>;

type CreateGraphFields =
  | 'organizationId'
  | 'projectId'
  | 'targetId'
  | 'type'
  | 'name'
  | 'sourceGraphId'
  | 'config';

@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class GraphStore {
  private logger: Logger;

  constructor(
    logger: Logger,
    private pg: PostgresDatabasePool,
  ) {
    this.logger = logger.child({
      source: 'GraphStore',
    });
  }

  async createGraph(
    args: Pick<BaseGraph, CreateGraphFields> | Pick<ContractGraph, CreateGraphFields>,
    trx: CommonQueryMethods = this.pg,
  ): Promise<Graph> {
    this.logger.debug(
      'create graph (organizationId=%s, projectId=%s, targetId=%s, name=%s)',
      args.organizationId,
      args.projectId,
      args.targetId,
      args.name,
    );

    return await trx
      .one(
        psql`/* createGraph */
        INSERT INTO "graphs" (
          "organization_id"
          , "project_id"
          , "target_id"
          , "name"
          , "type"
          , "config"
          , "source_graph_id"
        )
        VALUES (
          ${args.organizationId}
          , ${args.projectId}
          , ${args.targetId}
          , ${args.name}
          , ${args.type}
          , ${psql.jsonbOrNull(args.config)}
          , ${args.sourceGraphId}
        )
        RETURNING
          ${graphFields}
      `,
      )
      .then(GraphModel.parse);
  }

  async findGraphForTargetIdByName(targetId: string, graphName: string): Promise<Graph | null> {
    this.logger.debug(
      'find graph by target id and name (targetId=%s, graphName=%s)',
      targetId,
      graphName,
    );

    const query = psql`
      SELECT
        ${graphFields}
      FROM
        "graphs"
      WHERE
        "target_id" = ${targetId}
        AND "name" = ${graphName}
    `;

    return this.pg.maybeOne(query).then(GraphModel.nullable().parse);
  }

  async deleteGraphByTargetIdAndName(
    targetId: string,
    graphName: string,
    trx: CommonQueryMethods = this.pg,
  ): Promise<void> {
    this.logger.debug(
      'delete graph by target id and name (targetId=%s, graphName=%s)',
      targetId,
      graphName,
    );

    const query = psql`
      DELETE
      FROM
        "graphs"
      WHERE
        "target_id" = ${targetId}
        AND "name" = ${graphName}
    `;

    await trx.query(query);
  }
}

const graphFields = psql`
  "id"
  , "organization_id" AS "organizationId"
  , "project_id" AS "projectId"
  , "target_id" AS "targetId"
  , "name"
  , "type"
  , "config"
  , "source_graph_id" AS "sourceGraphId"
  , "is_backfilled" AS "isBackfilled"
  , to_json("created_at") AS "createdAt"
`;
