import { Injectable, Scope } from 'graphql-modules';
import { GraphStore, type Graph } from '../../graph/providers/graph-store';
import type { GraphSelector } from './operations-reader';

function toGraphSelector(graph: Graph): GraphSelector {
  return {
    graphId: graph.id,
    isDefaultGraph: graph.type === 'BASE',
  };
}

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class GraphSelectorProvider {
  private byTargetId = new Map<string, Promise<GraphSelector>>();
  private byGraphId = new Map<string, Promise<GraphSelector>>();

  constructor(private graphStore: GraphStore) {}

  forTarget(targetId: string): Promise<GraphSelector> {
    let selector = this.byTargetId.get(targetId);
    if (!selector) {
      selector = this.graphStore.getDefaultGraphForTargetId(targetId).then(toGraphSelector);
      this.byTargetId.set(targetId, selector);
    }
    return selector;
  }

  forSchemaVersion(version: { targetId: string; graphId: string | null }): Promise<GraphSelector> {
    const { graphId, targetId } = version;
    if (!graphId) {
      return this.forTarget(targetId);
    }

    let selector = this.byGraphId.get(graphId);
    if (!selector) {
      selector = this.graphStore
        .findGraphById(graphId)
        .then(graph => (graph ? toGraphSelector(graph) : this.forTarget(targetId)));
      this.byGraphId.set(graphId, selector);
    }

    return selector;
  }
}
