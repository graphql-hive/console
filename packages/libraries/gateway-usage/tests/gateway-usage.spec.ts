// THIS IS GOING TO BE MOVED AND MADE INTO AN INTEGRATION TEST. IT"LL BE BETTER BECAUSE IT WONT REQUIRE MOCKS.

// import { beforeEach, describe, expect, it, vi } from 'vitest';
// import { autoDisposeSymbol } from '@graphql-hive/core';
// import { createGatewayRuntime, GatewayPlugin, GatewayRuntime } from '@graphql-hive/gateway';
// import * as extractCoordinatesModule from '../src/extract-coordinates.js';
// import { createHive, useHive } from '../src/index.js';

// const MINIMAL_SUPERGRAPH = `
//   schema
//     @link(url: "https://specs.apollo.dev/link/v1.0")
//     @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
//   {
//     query: Query
//   }
//   directive @join__graph(name: String!, url: String!) on ENUM_VALUE
//   directive @join__type(graph: join__Graph!, key: String) repeatable on OBJECT
//   directive @link(url: String, as: String, for: String) repeatable on SCHEMA
//   enum join__Graph { PRODUCTS @join__graph(name: "products", url: "http://products.svc.local/graphql") }

//   type Query @join__type(graph: PRODUCTS) {
//     product: Product
//   }
//   type Product @join__type(graph: PRODUCTS, key: "id") {
//     id: ID!
//     price: Int
//   }
// `;

// describe('GraphQL Hive Plugin (Integration Style)', () => {
//   beforeEach(() => {
//     vi.restoreAllMocks();
//   });

//   describe('useHive - Initialization & Disposal', () => {
//     it('should autoDispose on provided signals', () => {
//       const client = createHive({ enabled: false, token: 'dummy-token' });
//       client[autoDisposeSymbol] = ['SIGINT'];

//       const processOnceSpy = vi.spyOn(process, 'once').mockImplementation((_event, cb) => {
//         return process;
//       });
//       const disposeSpy = vi.spyOn(client, 'dispose').mockResolvedValue(undefined);

//       useHive(client);

//       expect(processOnceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

//       // Execute the callback that was registered
//       const registeredCallback = processOnceSpy.mock.calls[0][1] as Function;
//       registeredCallback();
//       expect(disposeSpy).toHaveBeenCalledOnce();
//     });
//   });

//   describe('useHive - Plugin Hooks', () => {
//     let client: ReturnType<typeof createHive>;
//     let plugin: GatewayPlugin;
//     let gateway: GatewayRuntime;

//     beforeEach(() => {
//       client = createHive({ enabled: false, token: 'dummy-token' });
//       plugin = useHive(client);
//       gateway = createGatewayRuntime({
//         supergraph: MINIMAL_SUPERGRAPH,
//         plugins: () => [plugin],
//       });
//     });

//     it('onSchemaChange should call reportSchema on the client', () => {
//       const reportSchemaSpy = vi.spyOn(client, 'reportSchema').mockResolvedValue(undefined);
//       const fakeSchema = {} as any;

//       plugin.onSchemaChange!({ schema: fakeSchema } as any);

//       expect(reportSchemaSpy).toHaveBeenCalledWith({ schema: fakeSchema });
//     });

//     it('onSubscribe should call collectSubscriptionUsage on the client', () => {
//       const collectSubSpy = vi
//         .spyOn(client, 'collectSubscriptionUsage')
//         .mockImplementation(() => {});
//       const fakeArgs = { document: {} } as any;

//       plugin.onSubscribe!({ args: fakeArgs } as any);

//       expect(collectSubSpy).toHaveBeenCalledWith({ args: fakeArgs });
//     });

//     describe('onExecute', () => {
//       it('should inject the collection into context and handle sync results', async () => {
//         // Spy on the real collectUsage method
//         const fakeCollection = { finish: vi.fn() } as any;
//         vi.spyOn(client, 'collectUsage').mockReturnValue(fakeCollection);

//         const args = { contextValue: {} } as any;
//         const result = { data: { id: '1' } } as any;

//         gateway.handleRequest)
//         const onExecuteHook = await plugin.onExecute!({ args } as any);

//         // Context should be mutated
//         expect(args.contextValue.__hiveUsageCollection).toBe(fakeCollection);

//         // Handle Sync Execution
//         onExecuteHook!.onExecuteDone!({ result } as any);
//         expect(fakeCollection.finish).toHaveBeenCalledWith(args, result);
//       });

//       it('should handle async iterable results correctly', async () => {
//         const fakeCollection = { finish: vi.fn() } as any;
//         vi.spyOn(client, 'collectUsage').mockReturnValue(fakeCollection);

//         const args = { contextValue: {} } as any;
//         const onExecuteHook = await plugin.onExecute!({ args } as any);

//         // Create a real async generator to trigger the `isAsyncIterable` path
//         async function* mockAsyncIterable() {
//           yield { errors: [{ message: 'Stream Error 1' }] };
//           yield { errors: [{ message: 'Stream Error 2' }] };
//         }
//         const result = mockAsyncIterable();

//         const asyncHooks = (await onExecuteHook!.onExecuteDone!({ result } as any))!;

//         // Simulate Yoga streaming hooks
//         asyncHooks.onNext!({ result: { errors: [{ message: 'Stream Error 1' }] } } as any);
//         asyncHooks.onNext!({ result: { errors: [{ message: 'Stream Error 2' }] } } as any);
//         asyncHooks.onEnd!();

//         // Should collect and format all errors from the stream
//         expect(fakeCollection.finish).toHaveBeenCalledWith(args, {
//           errors: [{ message: 'Stream Error 1' }, { message: 'Stream Error 2' }],
//         });
//       });
//     });

//     describe('onSubgraphExecute', () => {
//       it('should abort early if usage tracking context is missing', () => {
//         const hookReturn = plugin.onSubgraphExecute!({
//           executionRequest: { context: {} } as any,
//           subgraphName: 'products',
//         } as any);
//         expect(hookReturn).toBeUndefined();
//       });

//       it('should finalize subgraph timers and handle errors via finishSubRequest', () => {
//         // 1. Setup our fake finishSubRequest callback
//         const finishSubRequestSpy = vi.fn();
//         const fakeCollection = {
//           subrequest: vi.fn().mockReturnValue(finishSubRequestSpy),
//         } as any;

//         // 2. Setup the coordinate extraction spy (so we don't need a massive real GraphQLSchema object)
//         vi.spyOn(extractCoordinatesModule, 'extractSchemaCoordinates').mockReturnValue({
//           'Product.price': 2,
//         });

//         // 3. Trigger the pre-subgraph hook
//         const onSubgraphExecuteDone = plugin.onSubgraphExecute!({
//           executionRequest: {
//             context: { __hiveUsageCollection: fakeCollection },
//             info: { schema: {} },
//             document: {},
//             rootValue: { __typename: '_Entity' }, // Triggers the ENTITY type path
//           } as any,
//           subgraphName: 'products',
//         } as any) as Function;

//         // Verify the subrequest was started with 'ENTITY'
//         expect(fakeCollection.subrequest).toHaveBeenCalledWith({
//           subgraph: 'products',
//           type: 'ENTITY',
//           paths: undefined,
//         });

//         // 4. Trigger the post-subgraph hook with a simulated error
//         const mockResult = {
//           data: null,
//           errors: [{ path: ['product', 'price'], extensions: { code: 'UNAUTHORIZED' } }],
//         };

//         onSubgraphExecuteDone({ result: mockResult });

//         // Verify completion handles the 500 status and maps the error formatting
//         expect(finishSubRequestSpy).toHaveBeenCalledWith({
//           status: 500,
//           fields: { 'Product.price': 2 },
//           errors: [{ coordinate: 'product.price', code: 'UNAUTHORIZED' }],
//         });
//       });

//       it('should return a 200 status when the subgraph yields no errors', () => {
//         const finishSubRequestSpy = vi.fn();
//         const fakeCollection = {
//           subrequest: vi.fn().mockReturnValue(finishSubRequestSpy),
//         } as any;

//         vi.spyOn(extractCoordinatesModule, 'extractSchemaCoordinates').mockReturnValue({});

//         const onSubgraphExecuteDone = plugin.onSubgraphExecute!({
//           executionRequest: {
//             context: { __hiveUsageCollection: fakeCollection },
//             info: { schema: {} },
//             document: {},
//           } as any,
//           subgraphName: 'users',
//         } as any) as Function;

//         // Simulate successful result
//         onSubgraphExecuteDone({ result: { data: { users: [] } } });

//         expect(finishSubRequestSpy).toHaveBeenCalledWith(
//           expect.objectContaining({
//             status: 200,
//             errors: undefined,
//           }),
//         );
//       });
//     });
//   });
// });
