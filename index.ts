/*
    htim -- v0.0.1 -- Public Domain - https://github.com/AWeirdDev/htim

    HTML immediate mode library. The main idea is that there's no need for
    special preprocessing just to render stuff. We can dump everything to
    the DOM as soon as we can.

    This library is deliberately close to the native JavaScript API, and
    no such step as compiling (i.e., transpiling) is needed. Fuck that.

    # Usage
    To start, you can use the `getDom()` method to query an element from
    the DOM. Then, you can start using the `Immediate` functionalities.

        getDom("#app").and((app) => {
            app.h1("Hello, World!");
        })

    Notice the `.and()` only runs when that element is found.
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

type HTMLAttributes<T extends HTMLElement> = {
    [
        K in keyof ElementProps<T> as CamelToKebab<K & string>
    ]: ElementProps<T>[K];
} & {
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

type Attribute<E extends HTMLElement> = HTMLAttributes<E> & {};
type Contents<E extends HTMLElement> = (
    string | Attribute<E> | ImmediateCallback<E>
)[];
type CreateCallback<E extends HTMLElement> = (
    ...contents: Contents<E>
) => Immediate<E>;

export type ImmediateCallback<E extends HTMLElement> = (
    e: Immediate<E>,
) => void;

/**
 * Immediate mode specification.
 */
export type Immediate<E extends HTMLElement> = {
    (): E;
    element: E | null;
    and: (cb: ImmediateCallback<E>) => Immediate<E>;
} & {
    [K in keyof HTMLElementTagNameMap]: CreateCallback<
        HTMLElementTagNameMap[K]
    >;
};
// fields to exclude from immediate mode geeneration
const INTERNAL_FIELDS = ["element", "and"];

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
            element.setAttribute(key, value.toString());
            break;
    }
}

// currying
function makeTagFunc(parent: Element, tag: string): CreateCallback<any> {
    return (...contents: Contents<any>) => {
        const element = document.createElement(tag);
        const immediateMode = immediate(element);

        // collect
        for (const content of contents) {
            if (typeof content === "string") {
                element.textContent += content.toString();
            } else if (typeof content === "function") {
                content(immediateMode);
            } else {
                Object.entries(content).forEach(([key, value]) => {
                    addAttribute(element, key, value);
                });
            }
        }

        // render
        if (!parent) throw new TypeError("cannot add child: parent is null");

        parent.appendChild(element);

        return immediateMode;
    };
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
        function (this: Immediate<E>) {
            return this.element;
        },
        {
            element,
            and(cb: ImmediateCallback<E>) {
                if (!this.element) return this;
                cb(this as Immediate<E>);
                return this;
            },
        },
    );

    return new Proxy(res, {
        get(target, prop) {
            if (INTERNAL_FIELDS.includes(prop as any))
                return Reflect.get(target, prop);

            if (typeof prop === "symbol") return undefined;

            return makeTagFunc(Reflect.get(target, "element")!, prop);
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
