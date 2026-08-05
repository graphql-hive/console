import { z } from 'zod';
import { defineTask, defineWorkflow } from './kit';

const fetchUser = defineTask({
  name: 'fetch-user',
  version: 1,

  input: z.strictObject({
    userId: z.string().uuid(),
  }),

  output: z.strictObject({
    id: z.string().uuid(),
    email: z.string().email(),
  }),
});

const fetchOrders = defineTask({
  name: 'fetch-orders',
  version: 1,

  input: z.strictObject({
    userId: z.string().uuid(),
  }),

  output: z.array(
    z.strictObject({
      id: z.string().uuid(),
      total: z.number(),
    }),
  ),
});

const syncUser = defineWorkflow({
  name: 'sync-user',
  version: 1,

  input: z.strictObject({
    userId: z.string().uuid(),
  }),

  output: z.strictObject({
    userId: z.string().uuid(),
    orderCount: z.number().int().nonnegative(),
  }),

  *run(ctx, input) {
    const { user, orders } = yield* ctx.all({
      user: ctx.task(fetchUser, {
        id: 'fetch-user',
        input: {
          userId: input.userId,
        },
      }),
      orders: ctx.task(fetchOrders, {
        id: 'fetch-orders',
        input: {
          userId: input.userId,
        },
      }),
    });

    const otherUser = yield* ctx.task(fetchUser, {
      id: 'fetch-user-1',
      input: {
        userId: 'foobars',
      },
    });

    return {
      userId: user.id,
      orderCount: orders.length,
    };
  },
});
