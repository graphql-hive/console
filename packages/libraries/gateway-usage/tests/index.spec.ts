import { autoDisposeSymbol } from '@graphql-hive/core';
import { createHive, useHive } from '../src';

describe('Initialization & Disposal', () => {
  it('should autoDispose on provided signals', () => {
    const client = createHive({ enabled: false, token: 'dummy-token' });
    client[autoDisposeSymbol] = ['SIGINT'];

    const processOnceSpy = vi.spyOn(process, 'once').mockReturnValue(process);
    const disposeSpy = vi.spyOn(client, 'dispose').mockResolvedValue(undefined);

    useHive(client);

    expect(processOnceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    // Execute the callback that was registered
    const registeredCallback = processOnceSpy.mock.calls[0][1] as Function;
    registeredCallback();
    expect(disposeSpy).toHaveBeenCalledOnce();
  });
});
