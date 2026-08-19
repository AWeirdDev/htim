//#region index.d.ts
type StateSubscriber<T> = (current: T) => void;
type Dispatcher<T> = (current: T) => T;
interface State<T> {
  /**
   * Subscribers of this state.
   */
  subscribers: Set<StateSubscriber<T>>;
  /**
   * The state value. You can call the state instead
   * to better align with the design choice of immediate
   * mode.
   *
   * ```js
   * const $count = state(42);
   * console.log($count()); // Output: 42
   * ```
   */
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
declare function state<T>(initial: T): State<T>;
type ExtractDepsT<D extends readonly any[]> = { [K in keyof D]: D[K] extends State<infer T> ? T : never; };
/**
 * Create a state which depends on other existing states,
 * with the value computed every time one of the depended
 * state is updated.
 *
 * This overload depends only on **one state**.
 */
declare function depend<T, D extends State<any>>(dependencies: D, factory: (dependency: D extends State<infer T> ? T : never) => T): State<T>;
/**
 * Create a state which depends on other existing states,
 * with the value computed every time one of the depended
 * state is updated.
 *
 * This overload depends on **multiple states**, provided
 * in an array.
 */
declare function depend<T, const D2 extends readonly State<any>[]>(dependencies: D2, factory: (...dependencies: ExtractDepsT<D2>) => T): State<T>;
//#endregion
export { State, StateSubscriber, depend, state };