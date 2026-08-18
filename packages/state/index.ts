export type StateSubscriber<T> = (current: T) => void;
type Dispatcher<T> = (current: T) => T;

interface StateProto<T> {
    // internals
    subscribers: Set<StateSubscriber<T>>;
    value: T;

    (): T;

    /**
     * Updates the state value, informing all subscribers
     * with the new provided value.
     *
     * It's worth noting that no value comparison (some might
     * refer to as "diffing") is done; you're in charge of
     * determining whether there's actually any change between
     * the current and the new value.
     *
     * If you like a dispatch-style state updater, use
     * `updateWith()` to update the value with a dispatch
     * function.
     *
     * @returns The updated value.
     */
    update: (newValue: T) => T;

    /**
     * Updates the state value with a dispatch function,
     * informing all subscribers with the new value returned
     * from the dispatcher.
     *
     * @example
     * ```js
     * const $count = state(0);
     *
     * $count.updateWith((current) => {
     *   console.log(current); // Output: 0
     *   return 42;
     * });
     *
     * console.log($count()); // Output: 42
     * ```
     *
     * The reason why this is a separate function is that: (i)
     * you can store functions for states, and more importantly,
     * (ii) `updateWith()` describes intent, while `update()`
     * should simply stay as just "update with a value," and not
     * "update with a dispatcher." If merged together, the intent
     * of `update()` would be vague, and if not careful, can cause
     * unexpected behavior.
     *
     * @returns The updated value.
     */
    updateWith: (dispatcher: Dispatcher<T>) => T;

    /**
     * Subscribe to state update triggers.
     */
    subscribe: <S extends StateSubscriber<T>>(subscriber: S) => S;

    /**
     * Remove a subscriber from state update triggers.
     */
    unsubscribe: (subscriber: StateSubscriber<T>) => void;

    /**
     * Notifies all subscribers of the current value.
     */
    notifyAll: () => void;
}

const StateProto = {
    update<T>(this: StateProto<T>, newValue: T): T {
        this.value = newValue;
        return newValue;
    },

    updateWith<T>(this: StateProto<T>, dispatcher: Dispatcher<T>): T {
        this.value = dispatcher(this.value);
        return this.value;
    },

    subscribe<T>(this: StateProto<T>, subscriber: StateSubscriber<T>) {
        this.subscribers.add(subscriber);
        return subscriber;
    },

    unsubscribe<T>(this: StateProto<T>, subscriber: StateSubscriber<T>) {
        this.subscribers.delete(subscriber);
    },

    notifyAll(this: StateProto<any>) {
        this.subscribers.forEach((subscriber) => subscriber(this.value));
    },
};

/**
 * Create a new state.
 *
 * @example
 * ```ts
 * const $count = state<number>(0);
 *
 * console.log($count()); // Output: 0
 * ```
 *
 * @param initial The initial value.
 */
export function state<T>(initial: T): StateProto<T> {
    function getter() {
        return (getter as StateProto<T>).value;
    }

    Object.assign(getter, {
        value: initial,
        subscribers: new Set<StateSubscriber<T>>(),
    });

    Object.setPrototypeOf(getter, StateProto);

    return getter as any;
}
