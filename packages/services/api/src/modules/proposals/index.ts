import { createModule } from 'graphql-modules';
import { BreakingSchemaChangeUsageHelper } from '../schema/providers/breaking-schema-changes-helper';
import { ContractsManager } from '../schema/providers/contracts-manager';
import { models as schemaModels } from '../schema/providers/models';
import { CompositionOrchestrator } from '../schema/providers/orchestrator/composition-orchestrator';
import { RegistryChecks } from '../schema/providers/registry-checks';
import { SchemaPublisher } from '../schema/providers/schema-publisher';
import { Storage } from '../shared/providers/storage';
import { SchemaProposalManager } from './providers/schema-proposal-manager';
import { SchemaProposalStorage } from './providers/schema-proposal-storage';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const proposalsModule = createModule({
  id: 'proposals',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [
    SchemaProposalManager,
    SchemaProposalStorage,

    /** Schema module providers -- To allow publishing checks */
    SchemaPublisher,
    RegistryChecks,
    ContractsManager,
    BreakingSchemaChangeUsageHelper,
    CompositionOrchestrator,
    ...schemaModels,
  ],
});
