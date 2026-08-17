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
  /**
   * HTML element dataset.
   *
   * This is a wrapper around the `dataset` property.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
   */
  dataset?: Record<string, string>;
};
/**
 * Arguments which can be passed to when invoking HTML node creation,
 * such as `.div()`.
 *
 * It's absolutely worth noting that at this stage, **nothing is put onto
 * the DOM yet**, therefore some DOM operations (such as finding the
 * parent) targeting the current node being built is subject to fail.
 * Thus, the name "builder" is solely here to remind you that it's still
 * in the building stage, so it's not on the DOM just yet.
 */
type ContentsBuilder<I, U extends Record<string, any>> = ((I extends (infer P extends HTMLElement) ? Attributes<P> : never) | string | ImmediateCallback<I, U>)[];
type CreateCallback<E extends HTMLElement, U extends Record<string, any>> = (...contents: ContentsBuilder<E, U>) => Immediate<E, U>;
type ImmediateCreate<CurrentT, U extends Record<string, any>> = { [K in keyof HTMLElementTagNameMap]: CreateCallback<HTMLElementTagNameMap[K], U>; } & {
  /**
   * Create an element with a custom tag.
   *
   * @param tag The tag of the element.
   */
  custom: <E extends HTMLElement>(tag: string, ...contents: ContentsBuilder<E, U>) => Immediate<E, U>;
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
  $: (...contents: ContentsBuilder<any, U>) => Immediate<any, U>;
  /**
   * Creates a fragment.
   *
   * This doesn't necessarily use `DocumentFragment`.
   */
  fragment: (...contents: ContentsBuilder<any, U>) => Immediate<any, U>;
};
/**
 * Immediate mode specification.
 */
type Immediate<T, Utils extends Record<string, any> = {}> = {
  (): T;
  /**
   * The underlying element or any data.
   */
  inner: T;
} & Utils & ImmediateCreate<T, Utils>;
type ImmediateCallback<I, U extends Record<string, any>> = (e: Immediate<I, U>) => void;
declare const IMMEDIATE_INTERNAL_FIELDS: readonly string[];
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
declare function createImmediateFactory<T, U extends Record<string, any> = {}, I = Immediate<T, U>>(handler: (target: I, tag: string, contents: any[]) => Immediate<any, any>, utils: U): (inner: T) => I;
//#endregion
export { ContentsBuilder, IMMEDIATE_INTERNAL_FIELDS, Immediate, ImmediateCallback, createImmediateFactory };