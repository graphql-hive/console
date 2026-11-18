import { createPreview, type NavPath } from 'react-foundry';
import { sdlModelPath } from '@/lib/sdl-definition-lookup';
import { SdlViewer } from './sdl-viewer';

export const nav: NavPath = 'Components/SdlViewer';

const SUBGRAPH = `
directive @key(fields: String!) repeatable on OBJECT | INTERFACE

type Query {
  me: User
  user(id: ID!): User
  search(filter: UserFilter): [Result!]!
}

interface Node {
  id: ID!
}

type User implements Node @key(fields: "id") {
  id: ID!
  name: String
  role: Role!
  posts: [Post!]!
  team: Team
}

type Post implements Node @key(fields: "id") {
  id: ID!
  title: String!
  author: User!
}

union Result = User | Post

enum Role {
  ADMIN
  MEMBER
}

input UserFilter {
  role: Role
}

extend type Team @key(fields: "id") {
  id: ID!
  members: [User!]!
}
`;

export const Default = createPreview(() => (
  <div className="w-[48rem]">
    <SdlViewer sdl={SUBGRAPH} modelPath={sdlModelPath('preview', 'users')} className="h-[32rem]" />
  </div>
));
