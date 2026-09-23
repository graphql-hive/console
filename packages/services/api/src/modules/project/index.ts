import { createModule } from 'graphql-modules';
import { ProjectManager } from './providers/project-manager';
import { ProjectStore } from './providers/project-store';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const projectModule = createModule({
  id: 'project',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [ProjectManager, ProjectStore],
});
