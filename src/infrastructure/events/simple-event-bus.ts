type Handler<T> = (event: T) => void;

export class SimpleEventBus {
  private handlers: Record<string, Handler<any>[]> = {};

  subscribe<T>(eventName: string, handler: Handler<T>) {
    if (!this.handlers[eventName]) this.handlers[eventName] = [];
    this.handlers[eventName].push(handler);
  }

  publish<T>(event: T) {
    const name = event.constructor.name;
    (this.handlers[name] || []).forEach((h) => h(event));
  }
}
