import { createModule } from 'graphql-modules';
import { ProjectManager } from './providers/project-manager';
import { ProjectStats } from './providers/project-stats';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const projectModule = createModule({
  id: 'project',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [ProjectManager, ProjectStats],
});
