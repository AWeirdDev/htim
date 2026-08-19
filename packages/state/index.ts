/*
    htim state -- v0.0.1 -- Public Domain -- https://github.com/AWeirdDev/htim
 */

export type StateSubscriber<T> = (current: T) => void;
type Dispatcher<T> = (current: T) => T;

export interface State<T> {
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

const State = {
    update<T>(this: State<T>, newValue: T): T {
        this.value = newValue;
        this.notifyAll();
        return newValue;
    },

    updateWith<T>(this: State<T>, dispatcher: Dispatcher<T>): T {
        this.value = dispatcher(this.value);
        this.notifyAll();
        return this.value;
    },

    subscribe<T>(this: State<T>, subscriber: StateSubscriber<T>) {
        this.subscribers.add(subscriber);
        return subscriber;
    },

    unsubscribe<T>(this: State<T>, subscriber: StateSubscriber<T>) {
        this.subscribers.delete(subscriber);
    },

    notifyAll(this: State<any>) {
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
export function state<T>(initial: T): State<T> {
    function getter() {
        return (getter as State<T>).value;
    }

    Object.assign(getter, {
        value: initial,
        subscribers: new Set<StateSubscriber<T>>(),
    });

    Object.setPrototypeOf(getter, State);

    return getter as any;
}

type ExtractDepsT<D extends readonly any[]> =
    { [K in keyof D]: D[K] extends State<infer T> ? T : never };

////////////////////////////////////
//                                //
// depend(dependencies, factory); //
//                                //
////////////////////////////////////

// ONE STATE

/**
 * Create a state which depends on other existing states,
 * with the value computed every time one of the depended
 * state is updated.
 *
 * This overload depends only on **one state**.
 */
export function depend<
    T,
    D extends State<any>,
>(
    dependencies: D,
    factory: (dependency: D extends State<infer T> ? T : never) => T,
): State<T>;

// MULTIPLE STATES

/**
 * Create a state which depends on other existing states,
 * with the value computed every time one of the depended
 * state is updated.
 *
 * This overload depends on **multiple states**, provided
 * in an array.
 */
export function depend<
    T,
    const D2 extends readonly State<any>[],
>(
    dependencies: D2,
    factory: (...dependencies: ExtractDepsT<D2>) => T,
): State<T>;

// NOTE: I'VE TRIED
// ================
//
// So, I've tried an API design like this:
//
//     depend((a, b, ...) => { ... }, $a, $b, ...)
//
// ...but it won't work because of how TypeScript infers
// types. So, we can only get something like:
//
//     depend([$a, $b, ...], (a, b, ...) => { ... })
//
// I tried this multiple times (while playing rolling sky)
// and yeah, you could say either I was distracted or
// TypeScript was.

export function depend(
    d: State<any>[] | State<any>,
    factory: (...dependencies: State<any>[]) => any,
): State<any> {
    const deps = Array.isArray(d) ? d : [d];
    const collectDependencies = () => deps.map(st => st());
    const $depended = state(factory(...collectDependencies()));
    return $depended;
}

/*
------------------------------------------------------------------------------
This software is available under 2 licenses -- choose whichever you prefer.
------------------------------------------------------------------------------
ALTERNATIVE A - MIT License
Copyright (c) 2026 AWeirdDev <awdjared@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
------------------------------------------------------------------------------
ALTERNATIVE B - Public Domain (www.unlicense.org)
This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org>
------------------------------------------------------------------------------
*/
