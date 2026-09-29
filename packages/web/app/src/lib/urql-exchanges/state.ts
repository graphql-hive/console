import { Exchange, Operation } from 'urql';
import { proxy, useSnapshot } from 'valtio';
import { map, pipe, tap } from 'wonka';

const inflightRequests = new Set<number>();

const NetworkState = proxy({
  inflightRequests: 0,
});

export const useInflightRequests = () => {
  const state = useSnapshot(NetworkState);
  return state.inflightRequests;
};

function end(key: number) {
  inflightRequests.delete(key);
  update();
}

function start(key: number) {
  inflightRequests.add(key);
  update();
}

function update() {
  NetworkState.inflightRequests = inflightRequests.size;
}

function getUniqueKey(op: Operation) {
  return op.key;
}

export const networkStatusExchange: Exchange = ({ forward }) => {
  return operations$ => {
    const forward$ = pipe(
      operations$,
      map(op => {
        // Subscriptions are long-lived, and a preload (a route loader run on hover) is not
        // something the viewer is waiting for; neither shows in the bar.
        if (op.kind === 'subscription' || op.context.preload === true) {
          return op;
        }
        if (op.kind === 'teardown') {
          end(getUniqueKey(op));
        } else {
          start(getUniqueKey(op));
        }

        return op;
      }),
    );

    return pipe(
      forward(forward$),
      tap(result => {
        setTimeout(() => {
          end(getUniqueKey(result.operation));
        }, 100);
      }),
    );
  };
};
