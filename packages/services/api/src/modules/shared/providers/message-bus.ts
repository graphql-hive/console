import { Injectable, Scope } from 'graphql-modules';
import Emittery from 'emittery';

@Injectable({
  scope: Scope.Operation,
})
export class MessageBus {
  private emitter = new Emittery();

  on<TPayload>(event: string, listener: (payload: TPayload) => Promise<void>): void {
    this.emitter.on(event, listener);
  }

  emit<TPayload>(event: string, payload: TPayload) {
    return this.emitter.emitSerial(event, payload);
  }
}
