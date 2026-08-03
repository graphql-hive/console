import { z } from 'zod';

export const FlattenNodePathSegmentSchema = z.union([
  z.object({ Field: z.string() }),
  z.object({ TypeCondition: z.array(z.string()) }),
  z.literal('@'),
]);

export type FlattenNodePathSegment = z.infer<typeof FlattenNodePathSegmentSchema>;

export const FlattenNodePathSchema = z.array(FlattenNodePathSegmentSchema);
export type FlattenNodePath = z.infer<typeof FlattenNodePathSchema>;

export const FlattenNodePathsSchema = z.array(FlattenNodePathSchema);
export type FlattenNodePaths = z.infer<typeof FlattenNodePathsSchema>;

export const FetchNodePathSegmentSchema = z.union([
  z.object({ Key: z.string() }),
  z.object({ TypenameEquals: z.array(z.string()) }),
]);
export type FetchNodePathSegment = z.infer<typeof FetchNodePathSegmentSchema>;

export const ValueSetterSchema = z.object({
  path: z.array(FetchNodePathSegmentSchema),
  setValueTo: z.string(),
});

export const KeyRenamerSchema = z.object({
  path: z.array(FetchNodePathSegmentSchema),
  renameKeyTo: z.string(),
});

export const FetchRewriteSchema = z.union([ValueSetterSchema, KeyRenamerSchema]);
export type FetchRewrite = z.infer<typeof FetchRewriteSchema>;

export const SelectionFieldSchema = z.object({
  kind: z.literal('Field'),
  name: z.string(),
});

export const SelectionInlineFragmentSchema = z.object({
  kind: z.literal('InlineFragment'),
  typeCondition: z.string().nullish(),
  selections: z.array(SelectionFieldSchema).nullish(),
});

export type SelectionInlineFragment = z.infer<typeof SelectionInlineFragmentSchema>;

export const SelectionFragmentSpreadSchema = z.object({
  kind: z.literal('FragmentSpread'),
  name: z.string(),
});

export const SelectionItemSchema = z.union([
  SelectionInlineFragmentSchema,
  SelectionFragmentSpreadSchema,
  SelectionFieldSchema,
]);
export type SelectionItem = z.infer<typeof SelectionItemSchema>;

export const SelectionSetSchema = z.array(SelectionItemSchema);
export type SelectionSet = z.infer<typeof SelectionSetSchema>;

export interface SequenceNodePlan {
  kind: 'Sequence';
  nodes: PlanNode[];
}
export interface ParallelNodePlan {
  kind: 'Parallel';
  nodes: PlanNode[];
}
export interface FlattenNodePlan {
  kind: 'Flatten';
  path: FlattenNodePath;
  node: PlanNode;
}
export interface ConditionNodePlan {
  kind: 'Condition';
  condition: string;
  ifClause?: PlanNode | null;
  elseClause?: PlanNode | null;
}
export interface SubscriptionNodePlan {
  kind: 'Subscription';
  primary: PlanNode;
}
export interface DeferNodePlan {
  kind: 'Defer';
  primary: DeferPrimary;
  deferred: DeferredNode[];
}
export interface DeferPrimary {
  subselection?: string | null;
  node?: PlanNode | null;
}
export interface DeferredNode {
  depends: DeferDependency[];
  label?: string | null;
  queryPath: string[];
  subselection?: string | null;
  node?: PlanNode | null;
}

export type FetchNodePlan = z.infer<typeof FetchNodePlanSchema>;
export type BatchFetchNodePlan = z.infer<typeof BatchFetchNodePlanSchema>;

export type PlanNode =
  | FetchNodePlan
  | BatchFetchNodePlan
  | SequenceNodePlan
  | ParallelNodePlan
  | FlattenNodePlan
  | ConditionNodePlan
  | SubscriptionNodePlan
  | DeferNodePlan;

export const PlanNodeSchema: z.ZodType<PlanNode> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    FetchNodePlanSchema,
    BatchFetchNodePlanSchema,
    SequenceNodePlanSchema,
    ParallelNodePlanSchema,
    FlattenNodePlanSchema,
    ConditionNodePlanSchema,
    SubscriptionNodePlanSchema,
    DeferNodePlanSchema,
  ]),
);

export const FetchNodePlanSchema = z.object({
  kind: z.literal('Fetch'),
  serviceName: z.string(),
  operationKind: z.string().nullish(),
  operationName: z.string().nullish(),
  operation: z.string(),
  variableUsages: z.array(z.string()).nullish(),
  requires: SelectionSetSchema.nullish(),
  inputRewrites: z.array(FetchRewriteSchema).nullish(),
  outputRewrites: z.array(FetchRewriteSchema).nullish(),
});

export const EntityBatchAliasSchema = z.object({
  alias: z.string(),
  representationsVariableName: z.string(),
  paths: FlattenNodePathsSchema,
  requires: SelectionSetSchema,
  inputRewrites: z.array(FetchRewriteSchema).nullish(),
  outputRewrites: z.array(FetchRewriteSchema).nullish(),
});
export type EntityBatchAlias = z.infer<typeof EntityBatchAliasSchema>;

export const EntityBatchSchema = z.object({
  aliases: z.array(EntityBatchAliasSchema),
});
export type EntityBatch = z.infer<typeof EntityBatchSchema>;

export const BatchFetchNodePlanSchema = z.object({
  kind: z.literal('BatchFetch'),
  serviceName: z.string(),
  operationKind: z.string().nullish(),
  operationName: z.string().nullish(),
  operation: z.string(),
  variableUsages: z.array(z.string()).nullish(),
  entityBatch: EntityBatchSchema,
});

export const SequenceNodePlanSchema = z.object({
  kind: z.literal('Sequence'),
  nodes: z.array(PlanNodeSchema),
});

export const ParallelNodePlanSchema = z.object({
  kind: z.literal('Parallel'),
  nodes: z.array(PlanNodeSchema),
});

export const FlattenNodePlanSchema = z.object({
  kind: z.literal('Flatten'),
  path: FlattenNodePathSchema,
  node: PlanNodeSchema,
});

export const ConditionNodePlanSchema = z.object({
  kind: z.literal('Condition'),
  condition: z.string(),
  ifClause: PlanNodeSchema.nullish(),
  elseClause: PlanNodeSchema.nullish(),
});

export const SubscriptionNodePlanSchema = z.object({
  kind: z.literal('Subscription'),
  primary: PlanNodeSchema,
});

export const DeferDependencySchema = z.object({
  id: z.string(),
  deferLabel: z.string().nullish(),
});
export type DeferDependency = z.infer<typeof DeferDependencySchema>;

export const DeferPrimarySchema = z.object({
  subselection: z.string().nullish(),
  node: PlanNodeSchema.nullish(),
});

export const DeferredNodeSchema = z.object({
  depends: z.array(DeferDependencySchema),
  label: z.string().nullish(),
  queryPath: z.array(z.string()),
  subselection: z.string().nullish(),
  node: PlanNodeSchema.nullish(),
});

export const DeferNodePlanSchema = z.object({
  kind: z.literal('Defer'),
  primary: DeferPrimarySchema,
  deferred: z.array(DeferredNodeSchema),
});

export const QueryPlanSchema = z.object({
  kind: z.literal('QueryPlan'),
  node: PlanNodeSchema.nullish(),
});

export type QueryPlan = z.infer<typeof QueryPlanSchema>;
