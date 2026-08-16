/*
    htim primitives -- v0.0.1 -- Public Domain -- https://github.com/AWeirdDev/htim

    Primitives for the htim ecosystem.

    The whole htim project relies heavily on the type system, as well as
    some "micro optimizations," thus I've separated the primitives from
    the core module in efforts to make the module layout clearer and easier
    for us to reason about.
 */

type EventHandlers<T> = {
    [K in keyof GlobalEventHandlersEventMap as `on${K}`]?: (
        this: T,
        event: GlobalEventHandlersEventMap[K],
    ) => any;
};

type ReadonlyDOMProps =
    | "offsetWidth"
    | "offsetHeight"
    | "offsetTop"
    | "offsetLeft"
    | "clientWidth"
    | "clientHeight"
    | "clientTop"
    | "clientLeft"
    | "scrollWidth"
    | "scrollHeight"
    | "nodeName"
    | "nodeType"
    | "nodeValue"
    | "parentNode"
    | "childNodes"
    | "firstChild"
    | "lastChild"
    | "previousSibling"
    | "nextSibling"
    | "attributes"
    | "ownerDocument"
    | "namespaceURI"
    | "tagName"
    | "innerHTML"
    | "outerHTML"
    | "textContent"
    | "innerText"
    | "outerText";

type CamelToKebab<S extends string> = S extends `${infer A}${infer B}`
    ? B extends Uncapitalize<B>
        ? `${Lowercase<A>}${CamelToKebab<B>}`
        : `${Lowercase<A>}-${CamelToKebab<B>}`
    : S;

type ExcludedHTMLProps =
    | "children"
    | "style"
    | "className"
    | "classList"
    | "ELEMENT_NODE"
    | "ATTRIBUTE_NODE"
    | "TEXT_NODE"
    | "CDATA_SECTION_NODE"
    | "ENTITY_REFERENCE_NODE"
    | "ENTITY_NODE"
    | "PROCESSING_INSTRUCTION_NODE"
    | "COMMENT_NODE"
    | "DOCUMENT_NODE"
    | "DOCUMENT_TYPE_NODE"
    | "DOCUMENT_FRAGMENT_NODE"
    | "NOTATION_NODE"
    | "DOCUMENT_POSITION_DISCONNECTED"
    | "DOCUMENT_POSITION_PRECEDING"
    | "DOCUMENT_POSITION_FOLLOWING"
    | "DOCUMENT_POSITION_CONTAINS"
    | "DOCUMENT_POSITION_CONTAINED_BY"
    | "DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC"
    | "FILTER_ACCEPT"
    | "FILTER_REJECT"
    | "FILTER_SKIP"
    | "SHOW_ALL"
    | "SHOW_ELEMENT"
    | "SHOW_ATTRIBUTE"
    | "SHOW_TEXT"
    | "SHOW_CDATA_SECTION"
    | "SHOW_ENTITY_REFERENCE"
    | "SHOW_ENTITY"
    | "SHOW_PROCESSING_INSTRUCTION"
    | "SHOW_COMMENT"
    | "SHOW_DOCUMENT"
    | "SHOW_DOCUMENT_TYPE"
    | "SHOW_DOCUMENT_FRAGMENT"
    | "SHOW_NOTATION"
    | "NONE"
    | "CAPTURING_PHASE"
    | "AT_TARGET"
    | "BUBBLING_PHASE"
    | "DOM_KEY_LOCATION_STANDARD"
    | "DOM_KEY_LOCATION_LEFT"
    | "DOM_KEY_LOCATION_RIGHT"
    | "DOM_KEY_LOCATION_NUMPAD"
    | "BUTTON_LEFT"
    | "BUTTON_MIDDLE"
    | "BUTTON_RIGHT"
    | "BUTTON_BACK"
    | "BUTTON_FORWARD"
    | "STYLE_RULE"
    | "IMPORT_RULE"
    | "MEDIA_RULE"
    | "FONT_FACE_RULE"
    | "PAGE_RULE"
    | "KEYFRAMES_RULE"
    | "KEYFRAME_RULE"
    | "NAMESPACE_RULE"
    | "COUNTER_STYLE_RULE"
    | "SUPPORTS_RULE"
    | "DOCUMENT_RULE"
    | "START_TO_START"
    | "START_TO_END"
    | "END_TO_END"
    | "END_TO_START"
    | "UNSENT"
    | "OPENED"
    | "HEADERS_RECEIVED"
    | "LOADING"
    | "DONE"
    | ReadonlyDOMProps
    | keyof EventHandlers<any>;

type ExtractProps<T> = {
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

type ElementProps<T extends HTMLElement> = Partial<
    Omit<Pick<T, ExtractProps<T>>, ExcludedHTMLProps>
>;

type Attributes<T extends HTMLElement> = {
    [
        K in keyof ElementProps<T> as CamelToKebab<K & string>
    ]: ElementProps<T>[K];
} & EventHandlers<T> & {
        /**
         * CSS styles.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style
         */
        style?: string;

        /**
         * HTML classes.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/class
         */
        class?: string | (string | undefined | null)[];

        /**
         * HTML element dataset.
         *
         * This is a wrapper around the `dataset` property.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
         */
        dataset?: Record<string, string>;
    };

export type Contents<I, U extends Record<string, any>> = (
    | (I extends infer P extends HTMLElement ? Attributes<P> : never)
    | string
    | ImmediateCallback<I, U>
)[];

type CreateCallback<E extends HTMLElement, U extends Record<string, any>> = (
    ...contents: Contents<E, U>
) => Immediate<E, U>;

type ImmediateCreate<CurrentT, U extends Record<string, any>> = {
    [K in keyof HTMLElementTagNameMap]: CreateCallback<
        HTMLElementTagNameMap[K],
        U
    >;
} & {
    /**
     * Create an element with a custom tag.
     *
     * @param tag The tag of the element.
     */
    custom: <E extends HTMLElement>(
        tag: string,
        ...contents: Contents<E, U>
    ) => Immediate<E, U>;

    /**
     * Appends a text node.
     *
     * This is an alias of `text`.
     */
    _: (...contents: string[]) => Immediate<CurrentT>;

    /**
     * Appends a text node.
     */
    text: (...contents: string[]) => Immediate<CurrentT>;

    /**
     * Creates a fragment.
     *
     * This is an alias of `fragment`.
     */
    $: (...contents: Contents<any, U>) => Immediate<any, U>;

    /**
     * Creates a fragment.
     *
     * This doesn't necessarily use `DocumentFragment`.
     */
    fragment: (...contents: Contents<any, U>) => Immediate<any, U>;
};

/**
 * Immediate mode specification.
 */
export type Immediate<T, Utils extends Record<string, any> = {}> = {
    /*
     * Get the underlying data, if any.
     *
     * This is an alias of `inner`.
     */
    (): T;

    /**
     * The underlying element or any data.
     */
    inner: T;
} & Utils &
    ImmediateCreate<T, Utils>;

export type ImmediateCallback<I, U extends Record<string, any>> = (
    e: Immediate<I, U>,
) => void;

export const IMMEDIATE_INTERNAL_FIELDS: readonly string[] = [
    "inner",

    "then",
    //  ^^^^^^
    // This is to prevent direct await makes this NEVER resolve, or when this is put inside of an async
    // block and is used as a return value, it never resolves. From MDN:
    //
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve
    // > The Promise.resolve() static method "resolves" a given value to a Promise.
    // > If the value is a promise, that promise is returned; if the value is a thenable,
    // > Promise.resolve() will call the then() method with two callbacks it prepared;
    // > otherwise the returned promise will be fulfilled with the value.
    //
    //
    // We have to add a special case here to prevent `then` from returning
    // a function.
];

/**
 * Create a factory for immediate modes.
 *
 * @param handler A function which gets triggered when the user
 * gets a property of the immediate mode. For instance, calling `.div()`
 * triggers your handler with `handler(i, "div", [])`, where `i` is the
 * underlying immediate mode object.
 * @param utils An object containing all the utilities items this
 * immediate mode has to offer. It's recommended to pass by reference to
 * save resources.
 */
export function createImmediateFactory<
    T,
    U extends Record<string, any> = {},
    I = Immediate<T, U>,
>(
    handler: (target: I, tag: string, contents: any[]) => Immediate<any, any>,
    utils: U,
): (inner: T) => I {
    const utilKeys = Object.keys(utils);
    const proxyHandler = {
        get(target: any, prop: symbol | string) {
            if (typeof prop === "symbol") return undefined;
            if (IMMEDIATE_INTERNAL_FIELDS.includes(prop)) return Reflect.get(target, prop);
            if (utilKeys.includes(prop)) return utils[prop];
            return (...contents: any[]) => handler(target, prop, contents);
        },
    };

    return (inner) => {
        const res = function () {
            return (res as any).inner;
        };
        (res as any).inner = inner;

        return new Proxy(res, proxyHandler);
    };
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
