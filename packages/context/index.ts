/*
    htim context -- v0.0.1 -- Public Domain -- https://github.com/AWeirdDev/htim

    # Example
    All you have to do is `createContext()` to create a new context token,
    and use it with `getContext()`. Contexts will pass down to a parent's
    children, enforced with types.

        const Theme = createContext<"theme", "dark" | "light">();
        //                          ^^^^^^^  ^^^^^^^^^^^^^^^^
        //                            id       context type

        const app = bindContext(select("#app"), Theme("dark"));
        app.div("The current theme is: ", (d) => getContext(d, Theme));

    # Warning
    Upon wrapping an immediate mode with this context, your language server
    will potentially be slower due to the type mappings going on.
 */

import { select } from "@htim/core";
import type { Immediate } from "@htim/primitives";

declare const __contextType: unique symbol;
declare const __contextSpecifier: unique symbol;

export type ContextToken<S extends string, T> = {
    (value: T): Filled<ContextToken<S, T>, T>;

    readonly [__contextType]: T;
    readonly [__contextSpecifier]: S;

    readonly token: symbol;
};

type Filled<C extends ContextToken<string, T>, T> = C & {
    value: T;
};

declare const __contextTokens: unique symbol;

// [AI CONTENT]
// I'm too inexperienced in TypeScript types that I have to outsource this.
// I suppose this is reasonable, but really, the structure is inconveniently
// complex.
//
// Also, I will not be mapping the args because those args are actually in
// the building stage, and can cause problems when attempting to find contexts
// because it checks the parent, while our node is currently completely detached
// from the DOM. See more in `ContentsBuilder`.
type WrapReturn<F, C extends ContextToken<any, any>> = F extends (
    ...args: infer A
) => Immediate<infer T2, infer U2>
    ? (...contents: A) => WithContext<Immediate<T2, U2>, C>
    : F;


export type WithContext<T, C extends ContextToken<any, any>> = (T extends Immediate<
    infer E,
    infer U
>
    ? {
          (): E;
      } & {
          [K in keyof Immediate<E, U>]: WrapReturn<Immediate<E, U>[K], C>;
      }
    : T) & {
    [__contextTokens]: C;
};
// [/AI CONTENT]

const CONTEXT_MAP: WeakMap<
    HTMLElement,
    Filled<ContextToken<string, any>, any>
> = new WeakMap();

export function createContext<const S extends string, T>(): ContextToken<S, T> {
    const token = Symbol();
    function filler(value: T) {
        return { token, value };
    }
    return Object.assign(filler, { token }) as any;
}

export function bindContext<
    I extends Immediate<HTMLElement, Record<string, any>>,
    C extends ContextToken<string, T>,
    T,
>(
    immediateMode: I,
    filledContext: Filled<C, T>,
): I extends WithContext<infer K, infer P>
    ? WithContext<K, P & C>
    : WithContext<I, C> {
    CONTEXT_MAP.set(immediateMode(), filledContext);
    return immediateMode as any;
}

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
export function getContexts<
    C extends ContextToken<string, any>,
    M extends Record<string, C>,
>(
    immediateMode: WithContext<Immediate<HTMLElement, Record<string, any>>, C>,
    mapping: M,
): { [K in keyof M]: M[K] extends ContextToken<string, infer T> ? T : never } {
    const result: Record<string, any> = {};
    const targets = new Map(
        Object.entries(mapping).map(([k, v]) => [v.token, k]),
    );

    let parent: HTMLElement | null = immediateMode();

    do {
        const entry = CONTEXT_MAP.get(parent);
        if (entry && targets.get(entry.token)) {
            result[targets.get(entry.token)!] = entry.value;
            targets.delete(entry.token);
        }
        parent = parent.parentElement;
    } while (parent && targets.size);

    if (targets.size)
        throw new Error(
            `some contexts weren't found: ${Array.from(targets.values()).join(", ")}`,
        );

    return result as any;
}

export function getContext<C extends ContextToken<string, any>>(
    immediateMode: WithContext<Immediate<HTMLElement, Record<string, any>>, C>,
    token: C,
): C extends ContextToken<string, infer T> ? T : never {
    return getContexts(immediateMode, { ctx: token }).ctx;
}

type LossyBindContextFn = <I extends Immediate<HTMLElement, any>, T>(
    immediateMode: I, filledContext: Filled<ContextToken<string, T>, T>
) => I;

/**
 * Binds context to an immediate mode with type information lost.
 *
 * This is especially useful when your language server is getting
 * slow and cannot handle the type system htim provides.
 *
 * At runtime, this behaves exactly the same as `bindContext()`,
 * there is no additional overhead using this.
 */
export const lossyBindContext: LossyBindContextFn = bindContext as any;

type TryGetContextsFn = <
    M extends Record<string, ContextToken<string, any>>,
>(
    immediateMode: Immediate<HTMLElement, Record<string, any>>,
    mapping: M,
) => {
    [K in keyof M]: M[K] extends ContextToken<string, infer T> ? T : never;
};

/**
 * Get multiple contexts with no type guarantee.
 *
 * This function **raises** if the required contexts are not found.
 *
 * At runtime, this behaves exactly the same as `getContexts()`,
 * there is no additional overhead using this.
 */
export const tryGetContexts: TryGetContextsFn = getContexts as any;

type TryGetContextFn = <C extends ContextToken<string, any>>(
    immediateMode: Immediate<HTMLElement, Record<string, any>>,
    token: C,
) => C extends ContextToken<string, infer T> ? T : never;

/**
 * Get context value with no type guarantee.
 *
 * This function **raises** if the required context is not found.
 *
 * At runtime, this behaves exactly the same as `getContext()`,
 * there is no additional overhead using this.
 */
export const tryGetContext: TryGetContextFn = getContext as any;
