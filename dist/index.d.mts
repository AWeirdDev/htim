//#region index.d.ts
type EventHandlers<T> = { [K in keyof GlobalEventHandlersEventMap as `on${K}`]?: (this: T, event: GlobalEventHandlersEventMap[K]) => any; };
type ReadonlyDOMProps = "offsetWidth" | "offsetHeight" | "offsetTop" | "offsetLeft" | "clientWidth" | "clientHeight" | "clientTop" | "clientLeft" | "scrollWidth" | "scrollHeight" | "nodeName" | "nodeType" | "nodeValue" | "parentNode" | "childNodes" | "firstChild" | "lastChild" | "previousSibling" | "nextSibling" | "attributes" | "ownerDocument" | "namespaceURI" | "tagName" | "innerHTML" | "outerHTML" | "textContent" | "innerText" | "outerText";
type CamelToKebab<S extends string> = S extends `${infer A}${infer B}` ? B extends Uncapitalize<B> ? `${Lowercase<A>}${CamelToKebab<B>}` : `${Lowercase<A>}-${CamelToKebab<B>}` : S;
type ExcludedHTMLProps = "children" | "style" | "className" | "classList" | "ELEMENT_NODE" | "ATTRIBUTE_NODE" | "TEXT_NODE" | "CDATA_SECTION_NODE" | "ENTITY_REFERENCE_NODE" | "ENTITY_NODE" | "PROCESSING_INSTRUCTION_NODE" | "COMMENT_NODE" | "DOCUMENT_NODE" | "DOCUMENT_TYPE_NODE" | "DOCUMENT_FRAGMENT_NODE" | "NOTATION_NODE" | "DOCUMENT_POSITION_DISCONNECTED" | "DOCUMENT_POSITION_PRECEDING" | "DOCUMENT_POSITION_FOLLOWING" | "DOCUMENT_POSITION_CONTAINS" | "DOCUMENT_POSITION_CONTAINED_BY" | "DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC" | "FILTER_ACCEPT" | "FILTER_REJECT" | "FILTER_SKIP" | "SHOW_ALL" | "SHOW_ELEMENT" | "SHOW_ATTRIBUTE" | "SHOW_TEXT" | "SHOW_CDATA_SECTION" | "SHOW_ENTITY_REFERENCE" | "SHOW_ENTITY" | "SHOW_PROCESSING_INSTRUCTION" | "SHOW_COMMENT" | "SHOW_DOCUMENT" | "SHOW_DOCUMENT_TYPE" | "SHOW_DOCUMENT_FRAGMENT" | "SHOW_NOTATION" | "NONE" | "CAPTURING_PHASE" | "AT_TARGET" | "BUBBLING_PHASE" | "DOM_KEY_LOCATION_STANDARD" | "DOM_KEY_LOCATION_LEFT" | "DOM_KEY_LOCATION_RIGHT" | "DOM_KEY_LOCATION_NUMPAD" | "BUTTON_LEFT" | "BUTTON_MIDDLE" | "BUTTON_RIGHT" | "BUTTON_BACK" | "BUTTON_FORWARD" | "STYLE_RULE" | "IMPORT_RULE" | "MEDIA_RULE" | "FONT_FACE_RULE" | "PAGE_RULE" | "KEYFRAMES_RULE" | "KEYFRAME_RULE" | "NAMESPACE_RULE" | "COUNTER_STYLE_RULE" | "SUPPORTS_RULE" | "DOCUMENT_RULE" | "START_TO_START" | "START_TO_END" | "END_TO_END" | "END_TO_START" | "UNSENT" | "OPENED" | "HEADERS_RECEIVED" | "LOADING" | "DONE" | ReadonlyDOMProps | keyof EventHandlers<any>;
type ExtractProps<T> = { [K in keyof T]: T[K] extends Function ? never : K; }[keyof T];
type ElementProps<T extends HTMLElement> = Partial<Omit<Pick<T, ExtractProps<T>>, ExcludedHTMLProps>>;
type Attributes<T extends HTMLElement> = { [K in keyof ElementProps<T> as CamelToKebab<K & string>]: ElementProps<T>[K]; } & EventHandlers<T> & {
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
type Contents<E extends HTMLElement> = (string | Attributes<E> | ImmediateCallback<E>)[];
type CreateCallback<E extends HTMLElement> = (...contents: Contents<E>) => Immediate<E>;
type ImmediateCreate = { [K in keyof HTMLElementTagNameMap]: CreateCallback<HTMLElementTagNameMap[K]>; } & {
  /**
   * Create custom element.
   */
  custom: <E extends HTMLElement>(tag: string, ...contents: Contents<E>) => Immediate<E>;
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
type ImmediateCallback<E extends HTMLElement> = (e: Immediate<E>) => void;
/**
 * Immediate mode specification.
 */
type Immediate<E extends HTMLElement> = {
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
type ImmediateFragment = {
  inner: MutableFragment;
} & Immediate<any>;
type ImmediateFragmentCallback = (frag: ImmediateFragment) => void;
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
declare class MutableFragment {
  #private;
  constructor(start: Node, end: Node);
  /**
   * Append a node to the fragment body.
   */
  appendChild(node: Node): void;
  /**
   * Clear all nodes in within this fragment.
   */
  clear(): void;
  /**
   * Strips both anchors from the DOM.
   */
  removeAnchors(): void;
}
/**
 * Apply immediate mode to the provided element.
 * The type parameter `E` allows you to specify what type
 * of element it is. For example, `HTMLDivElement`.
 *
 * @param element The target element.
 */
declare function immediate<E extends HTMLElement>(element: E | null): Immediate<E>;
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
declare function getDom<E extends HTMLElement = any>(selector: string): Immediate<E>;
/**
 * Get multiple DOM elements and put them in immediate mode.
 *
 * @param selector The CSS selector.
 */
declare function getDoms(selector: string): Immediate<any>[];
//#endregion
export { Immediate, ImmediateCallback, ImmediateFragment, ImmediateFragmentCallback, getDom, getDoms, immediate };