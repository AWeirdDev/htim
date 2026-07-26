/*
    htim -- v0.0.1 -- Public Domain - https://github.com/AWeirdDev/htim

    HTML immediate mode library. The main idea is that there's no need for
    special preprocessing just to render stuff. We can dump everything to
    the DOM as soon as we can.

    This library is deliberately close to the native JavaScript API, and
    no such step as compiling (i.e., transpiling) is needed. Fuck that.

    # Example
    To start, you can use the `getDom()` method to query an element from
    the DOM. Then, you can start using the `Immediate` functionalities.

        getDom("#app").and((app) => {
            app.h1("Hello, World!");
        })

    Notice that the function in  `.and()` only runs when that element is
    found.
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
    };

type Contents<E extends HTMLElement> = (
    string | Attributes<E> | ImmediateCallback<E>
)[];
type CreateCallback<E extends HTMLElement> = (
    ...contents: Contents<E>
) => Immediate<E>;
type ImmediateCreate = {
    [K in keyof HTMLElementTagNameMap]: CreateCallback<
        HTMLElementTagNameMap[K]
    >;
} & {
    /**
     * Create custom element.
     */
    custom: <E extends HTMLElement>(
        tag: string,
        ...contents: Contents<E>
    ) => Immediate<E>;

    /**
     * Appends a text node.
     *
     * This is an alias of `text`.
     */
    _: (...contents: string[]) => void;

    /**
     * Appends a text node.
     */
    text: (...contents: string[]) => void;

    /**
     * Creates a fragment.
     *
     * This is an alias of `fragment`.
     */
    $: (...contents: Contents<any>) => Immediate<any>;

    /**
     * Creates a fragment.
     *
     * This doesn't necessarily use `DocumentFragment`.
     */
    fragment: (...contents: Contents<any>) => Immediate<any>;
};

export type ImmediateCallback<E extends HTMLElement> = (
    e: Immediate<E>,
) => void;

/**
 * Immediate mode specification.
 */
export type Immediate<E extends HTMLElement> = {
    /*
     * Get the underlying element, if exists.
     *
     * @throws An error will be raised if this is wrapped
     * around a null or a fragment (`MutableFragment`).
     */
    (): E;

    /**
     * The underlying element. It may be `null`.
     */
    element: E | null;

    /**
     * Run the callback when the element exists.
     *
     * @param cb The callback to run.
     */
    and: (cb: ImmediateCallback<E>) => Immediate<E>;

    /**
     * Replace this element with something else.
     */
    replace: (cb: ImmediateFragmentCallback) => void;

    /**
     * Clear all nodes within this element.
     *
     * Internally, this replaces everything with a singular text node
     * using `.textContent = ""`.
     */
    clear: () => void;

    /**
     * Removes this node from the DOM.
     */
    remove: () => void;
} & ImmediateCreate;
const IMMEDIATE_INTERNAL_FIELDS = [
    "element",
    "and",
    "switch",
    "clear",
    "remove",
];

export type ImmediateFragment = {
    inner: MutableFragment;
} & Immediate<any>;
export type ImmediateFragmentCallback = (frag: ImmediateFragment) => void;
const IMMEDIATE_FRAG_INTERNAL_FIELDS = [...IMMEDIATE_INTERNAL_FIELDS, "inner"];

function addAttribute(element: HTMLElement, key: string, value: any) {
    switch (key) {
        case "style":
            element.style = value.toString();
            break;

        case "class":
            if (Array.isArray(value)) {
                element.className = value
                    .map((item: string) => item?.trim())
                    .filter((token) => token)
                    .join(" ");
            } else {
                element.className = value.toString();
            }
            break;

        default:
            if (key.startsWith("on")) {
                const eventName = key.slice(2);
                element.addEventListener(eventName, value);
            } else {
                element.setAttribute(key, value.toString());
            }
            break;
    }
}

// currying
function makeTagFunc(tag: string) {
    return (rawContents: any[]) => {
        // text node
        if (tag === "_" || tag === "text") {
            const node = document.createTextNode(
                rawContents.map(String).join(" "),
            );
            return { element: node };
        }

        if (tag === "$" || tag === "fragment") {
            const start = document.createComment("$");
            const end = document.createComment("/$");
            const immediateMode = immediateFragment(start, end);

            // we can directly create a document fragment without needing
            // MutableFragment here, because we only need to put the two
            // comments onto the DOM altogether later, which requires a tagless
            // container
            //
            // you can see the implementation of immediate() after calling
            // makeTagFunc(): it uses <parent>.appendChild(<element>)
            const fragment = document.createDocumentFragment();
            fragment.append(start, end);
            renderContents(fragment, rawContents, immediateMode);

            return { element: fragment, immediateMode };
        }

        const element = document.createElement(
            tag === "custom" ? rawContents[0] : tag,
        );
        const immediateMode = immediate(element);
        const contents = tag === "custom" ? rawContents.slice(1) : rawContents;

        renderContents(element, contents, immediateMode);

        return { element, immediateMode };
    };
}

function renderContents(
    node: Node,
    contents: Contents<any>,
    immediateMode: Immediate<any>,
) {
    // collect
    for (const content of contents) {
        if (typeof content === "string") {
            node.textContent += content.toString();
        } else if (typeof content === "function") {
            content(immediateMode);
        } else {
            // https://stackoverflow.com/questions/384286
            //
            // Essentially you'll need to do:
            //
            //   if (node instanceof HTMLElement)
            //
            // ...to ignore typescript warnings, but it should only
            // work on modern browsers, so we'll go through everything
            // just like forEach(), and the moment it fails, it bails out.

            Object.entries(content).find(([key, value]) => {
                try {
                    addAttribute(node as any, key, value);
                    //           ^^^^^^^^^^^  we'll do this deliberately
                } catch {
                    return true; // bail
                }
                return false;
            });
        }
    }
}

/**
 * A primitive which implements a fragment which can be put onto the DOM
 * and still be mutable.
 *
 * # Details
 * This doesn't use `DocumentFragment` because upon putting it
 * onto the DOM, it actually pours (i.e., drains) everything out of the
 * fragment container, so to make it truly follow the idea of "immediate,"
 * we can use comments to keep track of what's going on in the DOM without
 * storing anything additional here or making any new elements.
 */
class MutableFragment {
    // anchors
    #start: Node;
    #end: Node;

    constructor(start: Node, end: Node) {
        this.#start = start;
        this.#end = end;
    }

    /**
     * Append a node to the fragment body.
     */
    appendChild(node: Node) {
        this.#start.parentNode!.insertBefore(node, this.#end);
    }

    /**
     * Clear all nodes in within this fragment.
     */
    clear() {
        let node = this.#start.nextSibling;

        while (node != this.#end && node) {
            node.remove();
        }
    }

    /**
     * Strips both anchors from the DOM.
     */
    removeAnchors() {
        const parent = this.#start.parentNode!;
        parent.removeChild(this.#start);
        parent.removeChild(this.#end);
    }
}

function immediateFragment(start: Node, end: Node): ImmediateFragment {
    const fragment = Object.assign(
        function () {
            throw new TypeError("cannot get fragment as an HTMLElement");
        },
        {
            inner: new MutableFragment(start, end),
            element: null,

            and(cb: ImmediateCallback<any>) {
                cb(this as any);
                return this;
            },

            replace(cb: ImmediateFragmentCallback) {
                this.inner.clear();
                cb(this as any);
                return this;
            },

            clear() {
                this.inner.clear();
            },

            remove() {
                this.inner.removeAnchors();
            },
        },
    );

    return new Proxy(fragment, {
        get(target, prop) {
            if (typeof prop === "symbol") return undefined;
            if (IMMEDIATE_FRAG_INTERNAL_FIELDS.includes(prop))
                return Reflect.get(target, prop);

            return (...contents: Contents<any>) => {
                const { element, immediateMode } = makeTagFunc(prop)(contents);
                Reflect.get(target, "inner").appendChild(element);
                return immediateMode;
            };
        },
    }) as any;
}

/**
 * Apply immediate mode to the provided element.
 * The type parameter `E` allows you to specify what type
 * of element it is. For example, `HTMLDivElement`.
 *
 * @param element The target element.
 */
export function immediate<E extends HTMLElement>(
    element: E | null,
): Immediate<E> {
    const res = Object.assign(
        function () {
            return res.element;
        },
        {
            element,

            and(cb: ImmediateCallback<E>) {
                if (!this.element) return this;
                cb(this as Immediate<E>);
                return this;
            },

            replace(cb: ImmediateFragmentCallback) {
                if (!this.element) throw new TypeError("element is null");

                const start = document.createComment("$");
                const end = document.createComment("/$");

                this.element.replaceWith(end);
                start.parentNode!.insertBefore(end, start);

                const fragment = immediateFragment(start, end);
                cb(fragment);
            },

            clear() {
                if (!this.element) return;
                this.element.textContent = ""; // clears with a text node
            },

            remove() {
                this.element?.remove();
            },
        },
    );

    return new Proxy(res, {
        get(target, prop) {
            if (typeof prop === "symbol") return undefined;
            if (IMMEDIATE_INTERNAL_FIELDS.includes(prop))
                return Reflect.get(target, prop);

            return (...contents: any[]) => {
                const { element, immediateMode } = makeTagFunc(prop)(contents);

                // render
                const parent = Reflect.get(target, "element");
                if (!parent)
                    throw new TypeError("cannot add child: parent is null");
                parent.appendChild(element);

                return immediateMode;
            };
        },
    }) as any;
}

/**
 * Get a DOM element and apply immediate mode to it.
 *
 * This function does **NOT** raise.
 *
 * You can check if it's successful by checking the `element` field
 * in the `Immediate` object, but it's generally discouraged. You
 * can either use `.and(...)` to setup a callback if the element
 * is found, or just don't use this function and use
 * `immediate(element)` to apply immediate mode from an element
 * directly instead.
 *
 * @param selector The CSS selector.
 * @returns
 */
export function getDom<E extends HTMLElement = any>(
    selector: string,
): Immediate<E> {
    return immediate(document.querySelector(selector));
}

/**
 * Get multiple DOM elements and put them in immediate mode.
 *
 * @param selector The CSS selector.
 */
export function getDoms(selector: string): Immediate<any>[] {
    return (
        Array.from(document.querySelectorAll(selector)) as HTMLElement[]
    ).map(immediate);
}

/*

    Revision history
    ----------------

    v0.0.2 (2026-07-26) Incompatible changes:
                        - edit() is no longer available; use replace() instead

                        New features:
                        - MutableFragment introduced to replace existing anchoring
                          implementation for bulk replacing flatly laid-out elements.
                        - Use `$` / `fragment` for creating a fragment
                        - Use `_` / `text` for creating a text node

                        Fixes:
                        - Fixed an issue which makes `this` undefined in the annonymous
                          function in immediate()

    v0.0.1 (2026-07-15) Initial development and release

*/

/**
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
