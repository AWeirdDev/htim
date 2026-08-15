/*
    htim -- v0.6.0 -- Public Domain -- https://github.com/AWeirdDev/htim

    HTML immediate mode library. The main idea is that there's no need for
    special preprocessing just to render stuff. We can dump everything to
    the DOM as soon as we can.

    This library is deliberately close to the native JavaScript API, and
    no such step as compiling (i.e., transpiling) is needed. Fuck that.
 */

import { type Contents, type Immediate, IMMEDIATE_INTERNAL_FIELDS, createImmediateFactory } from "@htim/primitives";

/**
 * Utilities for immediate mode on the DOM.
 */
export interface DomImmediateUtils {
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
}

type DomContents = Contents<any, DomImmediateUtils>;
type DomImmediate<E extends HTMLElement> = Immediate<E, DomImmediateUtils>;

const DOM_IMMEDIATE_INTERNAL_FIELDS = [
    ...IMMEDIATE_INTERNAL_FIELDS,
    "and",
    "clear",
    "remove",
];

export type ImmediateFragment = Immediate<MutableFragment, DomImmediateUtils>;
export type ImmediateFragmentCallback = (frag: ImmediateFragment) => void;

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

        case "dataset":
            if (typeof value !== "object") return;

            // note: <element>.dataset is readonly
            //       we have to iterate things through
            Object.entries(value).forEach(([key, value]) => {
                element.dataset[key] = value!.toString();
            });

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

function renderContents(
    node: Node,
    contents: DomContents,
    immediateMode: DomImmediate<any>,
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
            const next = node.nextSibling;
            node.remove();
            node = next;
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

const DOM_IMMEDIATE_TAG_HANDLER = (tag: string, rawContents: any[]) => {
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

const DOM_IMMEDIATE_HANDLER = (target: any, tag: string, contents: any[]) => {
    const { element, immediateMode } = DOM_IMMEDIATE_TAG_HANDLER(tag, contents);

    // render
    const parent = target.inner;
    if (!parent)
        throw new TypeError("cannot add child: parent is null");
    parent.appendChild(element);

    return immediateMode || target;
};

const DOM_IMMEDIATE_FRAG_UTILS = {
    clear() {
        ((this as any).inner as MutableFragment).clear()
    },

    remove() {
        this.clear();
        ((this as any).inner as MutableFragment).removeAnchors();
    }
} satisfies DomImmediateUtils;

const DOM_IMMEDIATE_FRAG_FACTORY = createImmediateFactory(DOM_IMMEDIATE_HANDLER, DOM_IMMEDIATE_FRAG_UTILS);

function immediateFragment(start: Node, end: Node): ImmediateFragment {
    const mf = new MutableFragment(start, end);
    return DOM_IMMEDIATE_FRAG_FACTORY(mf);
}

const DOM_IMMEDIATE_UTILS = {
    clear() {
        if (!(this as any).inner) return;
        (this as any).inner.textContent = ""; // clears with a text node
    },

    remove() {
        (this as any).inner?.remove();
    },
} satisfies DomImmediateUtils;

const DOM_IMMEDIATE_FACTORY = createImmediateFactory<any, DomImmediateUtils>(DOM_IMMEDIATE_HANDLER, DOM_IMMEDIATE_UTILS);

/**
 * Apply immediate mode to the provided element.
 * The type parameter `E` allows you to specify what type
 * of element it is. For example, `HTMLDivElement`.
 *
 * @param inner The target element.
 */
export function immediate<I extends HTMLElement>(
    inner: I,
): Immediate<I, DomImmediateUtils> {
    return DOM_IMMEDIATE_FACTORY(inner);
}

/**
 * Get a DOM element and apply immediate mode to it.
 *
 * This function raises when it's not found.
 *
 * @param selector The CSS selector.
 * @returns
 */
export function select<E extends HTMLElement>(
    selector: string,
): Immediate<E, DomImmediateUtils> {
    const ele = document.querySelector(selector);
    if (ele === null) throw new Error(
        `cant find any element matching ${selector}`
    )
    return immediate<E>(ele as E);
}

/**
 * Get multiple DOM elements and put them in immediate mode.
 *
 * The type parameter allows you to cast the result to an
 * array of immediate modes built on specific types of elements.
 * For example:
 *
 * ```ts
 * // an array of div elements
 * selectAll<Immediate<HTMLDivElement>[]>(".some-divs");
 *
 * // you're sure what they are: a div and a button.
 * // though this is generally discouraged, you can never
 * // be that sure most of the time, it really depends
 * // on the browser's implementation of querySelectorAll()
 * selectAll<[
 *   Immediate<HTMLDivElement>,
 *   Immediate<HTMLButtonElement>
 * ]>(".some-class");
 * ```
 *
 * @param selector The CSS selector.
 */
export function selectAll<const T extends Immediate<any>[]>(
    selector: string,
): T {
    return (
        Array.from(document.querySelectorAll(selector)) as HTMLElement[]
    ).map(immediate) as any;
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
