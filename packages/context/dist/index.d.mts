import { Immediate } from "@htim/primitives";
//#region index.d.ts
declare const __contextType: unique symbol;
declare const __contextSpecifier: unique symbol;
type ContextToken<S extends string, T> = {
  (value: T): Filled<ContextToken<S, T>, T>;
  readonly [__contextType]: T;
  readonly [__contextSpecifier]: S;
  readonly token: symbol;
};
type Filled<C extends ContextToken<string, T>, T> = C & {
  value: T;
};
declare const __contextTokens: unique symbol;
type WrapReturn<R, C extends ContextToken<any, any>> = R extends Immediate<infer T2, infer U2> ? WithContext<Immediate<T2, U2>, C> : R;
type WrapReturns<F, C extends ContextToken<any, any>> = F extends ((...args: infer A extends readonly unknown[]) => infer R) ? (...contents: A) => WrapReturn<R, C> : F;
type WithContext<T, C extends ContextToken<any, any>> = (T extends Immediate<infer E, infer U> ? {
  (): E;
} & { [K in keyof Immediate<E, U>]: WrapReturns<Immediate<E, U>[K], C>; } : T) & {
  [__contextTokens]: C;
};
declare function createContext<const S extends string, T>(): ContextToken<S, T>;
declare function bindContext<I extends Immediate<HTMLElement, Record<string, any>>, C extends ContextToken<string, T>, T>(immediateMode: I, filledContext: Filled<C, T>): I extends WithContext<infer K, infer P> ? WithContext<K, P & C> : WithContext<I, C>;
/**
 * Get multiple contexts defined in the provided mapping.
 *
 * @example
 * ```ts
 * const Username = createContext<"username", string>();
 * const Timezone = createContext<"timezone", string>();
 *
 * const { name, timezone } =
 *     getContext(app, { name: Username, timezone: Timezone });
 * ```
 */
declare function getContexts<C extends ContextToken<string, any>, M extends Record<string, C>>(immediateMode: WithContext<Immediate<HTMLElement, Record<string, any>>, C>, mapping: M): { [K in keyof M]: M[K] extends ContextToken<string, infer T> ? T : never; };
declare function getContext<C extends ContextToken<string, any>>(immediateMode: WithContext<Immediate<HTMLElement, Record<string, any>>, C>, token: C): C extends ContextToken<string, infer T> ? T : never;
type TryGetContextsFn = <M extends Record<string, ContextToken<string, any>>>(immediateMode: Immediate<HTMLElement, Record<string, any>>, mapping: M) => { [K in keyof M]: M[K] extends ContextToken<string, infer T> ? T : never; };
/**
 * Get multiple contexts with no type guarantee.
 *
 * This function **raises** if the required contexts are not found.
 *
 * At runtime, this behaves exactly the same as `getContexts()`,
 * there is no additional overhead using this.
 */
declare const tryGetContexts: TryGetContextsFn;
type TryGetContextFn = <C extends ContextToken<string, any>>(immediateMode: Immediate<HTMLElement, Record<string, any>>, token: C) => C extends ContextToken<string, infer T> ? T : never;
/**
 * Get context value with no type guarantee.
 *
 * This function **raises** if the required context is not found.
 *
 * At runtime, this behaves exactly the same as `getContext()`,
 * there is no additional overhead using this.
 */
declare const tryGetContext: TryGetContextFn;
//#endregion
export { ContextToken, WithContext, bindContext, createContext, getContext, getContexts, tryGetContext, tryGetContexts };