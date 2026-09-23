/**
 * The schema histories `seed-history.mts` replays against a target: a federated storefront with
 * four contracts, and a single-schema shop. Each storyline is a list of events in the order they
 * happened, with `daysAgo` for the timestamp the rows get once everything is written.
 */

export type Event =
  | {
      kind: 'contract';
      daysAgo: number;
      name: string;
      includeTags: string[];
    }
  | {
      kind: 'publish';
      daysAgo: number;
      author: string;
      commit: string;
      service?: string;
      sdl: string;
      /** What the history should show for it, printed with the URL so the result can be eyeballed. */
      expect: string;
    }
  | {
      kind: 'check';
      daysAgo: number;
      author: string;
      commit: string;
      service?: string;
      sdl: string;
      expect: string;
    };

export type Storyline = {
  title: string;
  events: Event[];
};

const AUTHORS = ['Ada Lovelace', 'Grace Hopper', 'Linus Torvalds', 'Margaret Hamilton'];

let commitSeed = 0x3a1f0c;
function commit() {
  commitSeed = (commitSeed * 48271) % 0x7fffffff;
  return commitSeed.toString(16).padStart(7, '0').slice(0, 7);
}

// ---------------------------------------------------------------------------
// Federation: a storefront with users, products, reviews, orders and billing subgraphs, and four
// contracts that include what each audience may see.
// ---------------------------------------------------------------------------

const FED = `extend schema
  @link(url: "https://specs.apollo.dev/link/v1.0")
  @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@tag", "@shareable"])
`;

/**
 * `@tag` for each audience, on fields, arguments and enum values, never on types: a tag on a type
 * spreads to every field of that type across all subgraphs, which drags in fields meant for other
 * audiences. A type stays visible while any of its fields is, and an untagged required argument
 * fails the contract's composition.
 */
function tags(...names: string[]) {
  return names.map(name => `@tag(name: "${name}")`).join(' ');
}

const ALL = tags('public', 'mobile', 'partner');
const PM = tags('public', 'mobile');
const PP = tags('public', 'partner');
const B = tags('billing');

const users = {
  v1: `${FED}
type Query {
  me: User ${PM}
  user(id: ID! ${PP}): User ${PP}
}

type User @key(fields: "id") {
  id: ID! ${ALL}
  name: String! ${ALL}
  email: String! ${ALL}
}
`,
  // Renames name to fullName: a breaking change that got published anyway.
  v2: `${FED}
type Query {
  me: User ${PM}
  user(id: ID! ${PP}): User ${PP}
}

type User @key(fields: "id") {
  id: ID! ${ALL}
  fullName: String! ${ALL}
  email: String! ${ALL}
}
`,
  v3: `${FED}
type Query {
  me: User ${PM}
  user(id: ID! ${PP}): User ${PP}
}

type User @key(fields: "id") {
  id: ID! ${ALL}
  fullName: String! ${ALL}
  email: String! ${ALL}
  avatarUrl: String ${ALL}
}
`,
  // A check that drops email: breaking for the default graph and every contract that sees User.
  dropEmail: `${FED}
type Query {
  me: User ${PM}
  user(id: ID! ${PP}): User ${PP}
}

type User @key(fields: "id") {
  id: ID! ${ALL}
  fullName: String! ${ALL}
}
`,
  // A check that takes partner off Query.user (a breaking change for partner-api only) and adds a
  // mobile field returning a type with nothing mobile may see (that contract fails to compose).
  twoWaysWrong: `${FED}
type Query {
  me: User ${PM}
  user(id: ID! ${tags('public')}): User ${tags('public')}
  viewer: Viewer ${PM}
}

type Viewer {
  id: ID! ${PP}
  locale: String! ${PP}
}

type User @key(fields: "id") {
  id: ID! ${ALL}
  fullName: String! ${ALL}
  email: String! ${ALL}
  avatarUrl: String ${ALL}
}
`,
  // A check that removes Query.me: breaking for the default graph, public-api and mobile.
  dropMe: `${FED}
type Query {
  user(id: ID! ${PP}): User ${PP}
}

type User @key(fields: "id") {
  id: ID! ${ALL}
  fullName: String! ${ALL}
  email: String! ${ALL}
  avatarUrl: String ${ALL}
}
`,
};

const products = {
  v1: `${FED}
type Query {
  products(first: Int = 20 ${ALL}): [Product!]! ${ALL}
  product(id: ID! ${ALL}): Product ${ALL}
}

type Product @key(fields: "id") {
  id: ID! ${ALL}
  name: String! ${ALL}
  priceCents: Int! ${ALL}
}
`,
  v2: `${FED}
type Query {
  products(first: Int = 20 ${ALL}): [Product!]! ${ALL}
  product(id: ID! ${ALL}): Product ${ALL}
}

type Product @key(fields: "id") {
  id: ID! ${ALL}
  name: String! ${ALL}
  priceCents: Int! ${ALL}
  inventory: Int! ${ALL}
}
`,
  withDescription: `${FED}
type Query {
  products(first: Int = 20 ${ALL}): [Product!]! ${ALL}
  product(id: ID! ${ALL}): Product ${ALL}
}

type Product @key(fields: "id") {
  id: ID! ${ALL}
  name: String! ${ALL}
  description: String ${ALL}
  priceCents: Int! ${ALL}
  inventory: Int! ${ALL}
}
`,
};

const reviews = {
  v1: `${FED}
type Query {
  reviews(productId: ID! ${PM}): [Review!]! ${PM}
}

type Review @key(fields: "id") {
  id: ID! ${PM}
  rating: Int! ${PM}
  body: String ${PM}
  author: User ${PM}
}

type User @key(fields: "id") {
  id: ID! ${PM}
}

type Product @key(fields: "id") {
  id: ID! ${PM}
  reviews: [Review!]! ${PM}
}
`,
  // Adds createdAt, and loses the mobile tag on Review while Query.reviews keeps it: the mobile
  // contract reaches a type with nothing it may see, so its composition fails.
  v2Broken: `${FED}
type Query {
  reviews(productId: ID! ${PM}): [Review!]! ${PM}
}

type Review @key(fields: "id") {
  id: ID! ${tags('public')}
  rating: Int! ${tags('public')}
  body: String ${tags('public')}
  author: User ${tags('public')}
  createdAt: String! ${tags('public')}
}

type User @key(fields: "id") {
  id: ID! ${PM}
}

type Product @key(fields: "id") {
  id: ID! ${PM}
  reviews: [Review!]! ${PM}
}
`,
  v3: `${FED}
type Query {
  reviews(productId: ID! ${PM}): [Review!]! ${PM}
}

type Review @key(fields: "id") {
  id: ID! ${PM}
  rating: Int! ${PM}
  body: String ${PM}
  author: User ${PM}
  createdAt: String! ${PM}
}

type User @key(fields: "id") {
  id: ID! ${PM}
}

type Product @key(fields: "id") {
  id: ID! ${PM}
  reviews: [Review!]! ${PM}
}
`,
};

const orders = {
  v1: `${FED}
type Query {
  orders(first: Int = 20 ${ALL}): [Order!]! ${ALL}
}

type Order @key(fields: "id") {
  id: ID! ${ALL}
  status: OrderStatus! ${ALL}
  totalCents: Int! ${ALL}
  items: [OrderItem!]! ${ALL}
}

enum OrderStatus {
  PENDING ${ALL}
  PAID ${ALL}
  SHIPPED ${ALL}
  DELIVERED ${ALL}
  CANCELLED ${ALL}
}

type OrderItem {
  product: Product! ${ALL}
  quantity: Int! ${ALL}
}

type Product @key(fields: "id") {
  id: ID! ${ALL}
}

type User @key(fields: "id") {
  id: ID! ${ALL}
  orders: [Order!]! ${ALL}
}
`,
  v2: `${FED}
type Query {
  orders(first: Int = 20 ${ALL}): [Order!]! ${ALL}
}

type Order @key(fields: "id") {
  id: ID! ${ALL}
  status: OrderStatus! ${ALL}
  totalCents: Int! ${ALL}
  items: [OrderItem!]! ${ALL}
  shippingAddress: Address ${ALL}
}

type Address {
  line1: String! ${ALL}
  city: String! ${ALL}
  country: String! ${ALL}
}

enum OrderStatus {
  PENDING ${ALL}
  PAID ${ALL}
  SHIPPED ${ALL}
  DELIVERED ${ALL}
  CANCELLED ${ALL}
}

type OrderItem {
  product: Product! ${ALL}
  quantity: Int! ${ALL}
}

type Product @key(fields: "id") {
  id: ID! ${ALL}
}

type User @key(fields: "id") {
  id: ID! ${ALL}
  orders: [Order!]! ${ALL}
}
`,
  // A check referencing a type nobody defines: composition fails for the default graph.
  unknownType: `${FED}
type Query {
  orders(first: Int = 20 ${ALL}): [Order!]! ${ALL}
}

type Order @key(fields: "id") {
  id: ID! ${ALL}
  status: OrderStatus! ${ALL}
  total: Money! ${ALL}
  items: [OrderItem!]! ${ALL}
}

enum OrderStatus {
  PENDING ${ALL}
  PAID ${ALL}
  SHIPPED ${ALL}
  DELIVERED ${ALL}
  CANCELLED ${ALL}
}

type OrderItem {
  product: Product! ${ALL}
  quantity: Int! ${ALL}
}

type Product @key(fields: "id") {
  id: ID! ${ALL}
}

type User @key(fields: "id") {
  id: ID! ${ALL}
  orders: [Order!]! ${ALL}
}
`,
};

const billing = {
  v1: `${FED}
type Query {
  invoices(first: Int = 20 ${B}): [Invoice!]! ${B}
  invoice(id: ID! ${B}): Invoice ${B}
}

type Invoice @key(fields: "id") {
  id: ID! ${B}
  amountCents: Int! ${B}
  status: InvoiceStatus! ${B}
  customer: User! ${B}
}

enum InvoiceStatus {
  DRAFT ${B}
  OPEN ${B}
  PAID ${B}
  VOID ${B}
}

type User @key(fields: "id") {
  id: ID! ${B}
  invoices: [Invoice!]! ${B}
}
`,
  v2: `${FED}
type Query {
  invoices(first: Int = 20 ${B}): [Invoice!]! ${B}
  invoice(id: ID! ${B}): Invoice ${B}
}

type Invoice @key(fields: "id") {
  id: ID! ${B}
  amountCents: Int! ${B}
  status: InvoiceStatus! ${B}
  dueDate: String ${B}
  customer: User! ${B}
}

enum InvoiceStatus {
  DRAFT ${B}
  OPEN ${B}
  PAID ${B}
  VOID ${B}
}

type User @key(fields: "id") {
  id: ID! ${B}
  invoices: [Invoice!]! ${B}
}
`,
  // A check that takes the billing tag off Query.invoices: the default graph keeps the field, the
  // billing contract loses it, so only that contract has a breaking change.
  untagInvoices: `${FED}
type Query {
  invoices(first: Int = 20): [Invoice!]!
  invoice(id: ID! ${B}): Invoice ${B}
}

type Invoice @key(fields: "id") {
  id: ID! ${B}
  amountCents: Int! ${B}
  status: InvoiceStatus! ${B}
  dueDate: String ${B}
  customer: User! ${B}
}

enum InvoiceStatus {
  DRAFT ${B}
  OPEN ${B}
  PAID ${B}
  VOID ${B}
}

type User @key(fields: "id") {
  id: ID! ${B}
  invoices: [Invoice!]! ${B}
}
`,
};

export const federation: Storyline = {
  title: 'Storefront: five subgraphs, four contracts',
  events: [
    { kind: 'contract', daysAgo: 45, name: 'public-api', includeTags: ['public'] },
    { kind: 'contract', daysAgo: 45, name: 'mobile', includeTags: ['mobile'] },
    {
      kind: 'publish',
      daysAgo: 44,
      author: AUTHORS[0],
      commit: commit(),
      service: 'users',
      sdl: users.v1,
      expect: 'initial version',
    },
    {
      kind: 'publish',
      daysAgo: 43,
      author: AUTHORS[1],
      commit: commit(),
      service: 'products',
      sdl: products.v1,
      expect: 'products added',
    },
    {
      kind: 'check',
      daysAgo: 42,
      author: AUTHORS[1],
      commit: commit(),
      service: 'products',
      sdl: products.v2,
      expect: 'passes with a safe change',
    },
    {
      kind: 'publish',
      daysAgo: 41,
      author: AUTHORS[2],
      commit: commit(),
      service: 'reviews',
      sdl: reviews.v1,
      expect: 'reviews added',
    },
    { kind: 'contract', daysAgo: 39, name: 'partner-api', includeTags: ['partner'] },
    {
      kind: 'publish',
      daysAgo: 38,
      author: AUTHORS[3],
      commit: commit(),
      service: 'orders',
      sdl: orders.v1,
      expect: 'orders added, first partner-api contract version',
    },
    { kind: 'contract', daysAgo: 36, name: 'billing', includeTags: ['billing'] },
    {
      kind: 'publish',
      daysAgo: 35,
      author: AUTHORS[0],
      commit: commit(),
      service: 'billing',
      sdl: billing.v1,
      expect: 'billing added, first billing contract version',
    },
    {
      kind: 'check',
      daysAgo: 33,
      author: AUTHORS[2],
      commit: commit(),
      service: 'users',
      sdl: users.dropEmail,
      expect: 'fails: unapproved breaking change on the default graph and three contracts',
    },
    {
      kind: 'publish',
      daysAgo: 30,
      author: AUTHORS[1],
      commit: commit(),
      service: 'products',
      sdl: products.v2,
      expect: 'safe change',
    },
    {
      kind: 'check',
      daysAgo: 29,
      author: AUTHORS[3],
      commit: commit(),
      service: 'orders',
      sdl: orders.unknownType,
      expect: 'fails: composition error on the default graph, every contract fails too',
    },
    {
      kind: 'publish',
      daysAgo: 26,
      author: AUTHORS[0],
      commit: commit(),
      service: 'users',
      sdl: users.v2,
      expect: 'breaking change published',
    },
    {
      kind: 'check',
      daysAgo: 22,
      author: AUTHORS[2],
      commit: commit(),
      service: 'reviews',
      sdl: reviews.v2Broken,
      expect: 'fails: default graph passes, mobile contract fails composition',
    },
    {
      kind: 'publish',
      daysAgo: 21,
      author: AUTHORS[2],
      commit: commit(),
      service: 'reviews',
      sdl: reviews.v2Broken,
      expect: 'version with a failed mobile contract',
    },
    {
      kind: 'publish',
      daysAgo: 18,
      author: AUTHORS[2],
      commit: commit(),
      service: 'reviews',
      sdl: reviews.v3,
      expect: 'mobile contract composes again',
    },
    {
      kind: 'check',
      daysAgo: 14,
      author: AUTHORS[0],
      commit: commit(),
      service: 'billing',
      sdl: billing.untagInvoices,
      expect: 'fails: default graph passes, billing contract has an unapproved breaking change',
    },
    {
      kind: 'publish',
      daysAgo: 12,
      author: AUTHORS[3],
      commit: commit(),
      service: 'orders',
      sdl: orders.v2,
      expect: 'safe change',
    },
    {
      kind: 'check',
      daysAgo: 10,
      author: AUTHORS[1],
      commit: commit(),
      service: 'users',
      sdl: users.twoWaysWrong,
      expect: 'fails: mobile fails composition, partner-api has an unapproved breaking change',
    },
    {
      kind: 'publish',
      daysAgo: 7,
      author: AUTHORS[0],
      commit: commit(),
      service: 'billing',
      sdl: billing.v2,
      expect: 'safe change',
    },
    {
      kind: 'check',
      daysAgo: 5,
      author: AUTHORS[1],
      commit: commit(),
      service: 'products',
      sdl: products.withDescription,
      expect: 'passes with a safe change on every contract',
    },
    {
      kind: 'publish',
      daysAgo: 2,
      author: AUTHORS[0],
      commit: commit(),
      service: 'users',
      sdl: users.v3,
      expect: 'safe change, latest version',
    },
    {
      kind: 'check',
      daysAgo: 1,
      author: AUTHORS[2],
      commit: commit(),
      service: 'users',
      sdl: users.dropMe,
      expect: 'fails: unapproved breaking change on the default graph, public-api and mobile',
    },
    {
      kind: 'check',
      daysAgo: 0.1,
      author: AUTHORS[0],
      commit: commit(),
      service: 'users',
      sdl: users.v3,
      expect: 'passes with no changes',
    },
  ],
};

// ---------------------------------------------------------------------------
// Single: a shop as one schema.
// ---------------------------------------------------------------------------

const shop = {
  v1: `type Query {
  products(first: Int = 20): [Product!]!
  product(id: ID!): Product
}

type Product {
  id: ID!
  name: String!
  price: Int!
}
`,
  v2: `type Query {
  me: User
  products(first: Int = 20): [Product!]!
  product(id: ID!): Product
}

type User {
  id: ID!
  name: String!
  email: String!
}

type Product {
  id: ID!
  name: String!
  price: Int!
}
`,
  v3: `type Query {
  me: User
  products(first: Int = 20): [Product!]!
  product(id: ID!): Product
}

type User {
  id: ID!
  name: String!
  email: String!
}

type Product {
  id: ID!
  name: String!
  description: String
  price: Int!
  reviews: [Review!]!
}

type Review {
  id: ID!
  rating: Int!
  body: String
  author: User
}
`,
  // price goes from Int to Float: breaking.
  v4: `type Query {
  me: User
  products(first: Int = 20): [Product!]!
  product(id: ID!): Product
}

type User {
  id: ID!
  name: String!
  email: String!
}

type Product {
  id: ID!
  name: String!
  description: String
  price: Float!
  reviews: [Review!]!
}

type Review {
  id: ID!
  rating: Int!
  body: String
  author: User
}
`,
  v5: `type Query {
  me: User
  products(first: Int = 20): [Product!]!
  product(id: ID!): Product
}

type Mutation {
  addReview(productId: ID!, rating: Int!, body: String): Review!
}

type User {
  id: ID!
  name: String!
  email: String!
}

type Product {
  id: ID!
  name: String!
  description: String
  price: Float!
  reviews: [Review!]!
}

type Review {
  id: ID!
  rating: Int!
  body: String
  author: User
}
`,
  // description removed: breaking.
  v6: `type Query {
  me: User
  products(first: Int = 20): [Product!]!
  product(id: ID!): Product
}

type Mutation {
  addReview(productId: ID!, rating: Int!, body: String): Review!
}

type User {
  id: ID!
  name: String!
  email: String!
}

type Product {
  id: ID!
  name: String!
  price: Float!
  reviews: [Review!]!
}

type Review {
  id: ID!
  rating: Int!
  body: String
  author: User
}
`,
  v7: `type Query {
  me: User
  products(first: Int = 20): [Product!]!
  product(id: ID!): Product
  orders(first: Int = 20): [Order!]!
}

type Mutation {
  addReview(productId: ID!, rating: Int!, body: String): Review!
}

type User {
  id: ID!
  name: String!
  email: String!
  orders: [Order!]!
}

type Product {
  id: ID!
  name: String!
  price: Float!
  reviews: [Review!]!
}

type Review {
  id: ID!
  rating: Int!
  body: String
  author: User
}

type Order {
  id: ID!
  status: OrderStatus!
  total: Float!
  items: [OrderItem!]!
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}

type OrderItem {
  product: Product!
  quantity: Int!
}
`,
  v8: `type Query {
  me: User
  products(first: Int = 20): [Product!]!
  product(id: ID!): Product
  orders(first: Int = 20): [Order!]!
}

type Mutation {
  addReview(productId: ID!, rating: Int!, body: String): Review!
}

type User {
  id: ID!
  name: String!
  email: String!
  avatarUrl: String
  orders: [Order!]!
}

type Product {
  id: ID!
  name: String!
  price: Float!
  reviews: [Review!]!
}

type Review {
  id: ID!
  rating: Int!
  body: String
  author: User
}

type Order {
  id: ID!
  status: OrderStatus!
  total: Float!
  items: [OrderItem!]!
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}

type OrderItem {
  product: Product!
  quantity: Int!
}
`,
  // A check that drops Query.me: breaking.
  dropMe: `type Query {
  products(first: Int = 20): [Product!]!
  product(id: ID!): Product
  orders(first: Int = 20): [Order!]!
}

type Mutation {
  addReview(productId: ID!, rating: Int!, body: String): Review!
}

type User {
  id: ID!
  name: String!
  email: String!
  avatarUrl: String
  orders: [Order!]!
}

type Product {
  id: ID!
  name: String!
  price: Float!
  reviews: [Review!]!
}

type Review {
  id: ID!
  rating: Int!
  body: String
  author: User
}

type Order {
  id: ID!
  status: OrderStatus!
  total: Float!
  items: [OrderItem!]!
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}

type OrderItem {
  product: Product!
  quantity: Int!
}
`,
  // A check with a type nobody defines: fails before any diff.
  unknownType: `type Query {
  me: User
  products(first: Int = 20): [Product!]!
  product(id: ID!): Product
  orders(first: Int = 20): [Order!]!
  cart: Cart
}

type User {
  id: ID!
  name: String!
  email: String!
  avatarUrl: String
  orders: [Order!]!
}

type Product {
  id: ID!
  name: String!
  price: Float!
  reviews: [Review!]!
}

type Review {
  id: ID!
  rating: Int!
  body: String
  author: User
}

type Order {
  id: ID!
  status: OrderStatus!
  total: Float!
  items: [OrderItem!]!
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}

type OrderItem {
  product: Product!
  quantity: Int!
}
`,
};

export const single: Storyline = {
  title: 'Shop: one schema',
  events: [
    {
      kind: 'publish',
      daysAgo: 40,
      author: AUTHORS[0],
      commit: commit(),
      sdl: shop.v1,
      expect: 'initial version',
    },
    {
      kind: 'check',
      daysAgo: 37,
      author: AUTHORS[1],
      commit: commit(),
      sdl: shop.v2,
      expect: 'passes with safe changes',
    },
    {
      kind: 'publish',
      daysAgo: 36,
      author: AUTHORS[1],
      commit: commit(),
      sdl: shop.v2,
      expect: 'users added',
    },
    {
      kind: 'publish',
      daysAgo: 30,
      author: AUTHORS[2],
      commit: commit(),
      sdl: shop.v3,
      expect: 'reviews and descriptions added',
    },
    {
      kind: 'check',
      daysAgo: 25,
      author: AUTHORS[3],
      commit: commit(),
      sdl: shop.v4,
      expect: 'fails: price changes type',
    },
    {
      kind: 'publish',
      daysAgo: 24,
      author: AUTHORS[3],
      commit: commit(),
      sdl: shop.v4,
      expect: 'breaking change published',
    },
    {
      kind: 'publish',
      daysAgo: 17,
      author: AUTHORS[0],
      commit: commit(),
      sdl: shop.v5,
      expect: 'mutation added',
    },
    {
      kind: 'check',
      daysAgo: 12,
      author: AUTHORS[2],
      commit: commit(),
      sdl: shop.v6,
      expect: 'fails: description removed',
    },
    {
      kind: 'publish',
      daysAgo: 11,
      author: AUTHORS[2],
      commit: commit(),
      sdl: shop.v6,
      expect: 'breaking change published',
    },
    {
      kind: 'check',
      daysAgo: 6,
      author: AUTHORS[1],
      commit: commit(),
      sdl: shop.v7,
      expect: 'passes with safe changes',
    },
    {
      kind: 'publish',
      daysAgo: 4,
      author: AUTHORS[1],
      commit: commit(),
      sdl: shop.v7,
      expect: 'orders added',
    },
    {
      kind: 'check',
      daysAgo: 2,
      author: AUTHORS[3],
      commit: commit(),
      sdl: shop.unknownType,
      expect: 'fails: unknown type',
    },
    {
      kind: 'publish',
      daysAgo: 1,
      author: AUTHORS[0],
      commit: commit(),
      sdl: shop.v8,
      expect: 'safe change, latest version',
    },
    {
      kind: 'check',
      daysAgo: 0.3,
      author: AUTHORS[2],
      commit: commit(),
      sdl: shop.dropMe,
      expect: 'fails: Query.me removed',
    },
    {
      kind: 'check',
      daysAgo: 0.05,
      author: AUTHORS[0],
      commit: commit(),
      sdl: shop.v8,
      expect: 'passes with no changes',
    },
  ],
};
