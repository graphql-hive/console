import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';
import { createHive, useHive } from '../src';

describe('Disposal', () => {
  it('should dispose the client along with the gateway', async () => {
    const client = createHive({ enabled: false, token: 'dummy-token' });
    const clientDisposeSpy = vi.spyOn(client, 'dispose');
    const gw = createGatewayRuntime({
      supergraph: `type Query { ok: Boolean }`,
      plugins: () => [useHive(client)],
    });
    await gw.dispose();

    expect(clientDisposeSpy).toHaveBeenCalledOnce();
  });
});
