import { ContentsBuilder, Immediate } from "@htim/primitives";
//#region index.d.ts
/**
 * Utilities for immediate mode on the DOM.
 */
interface DomImmediateUtils {
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
  /**
   * Replaces the text of the current node with a new one.
   *
   * If there are multiple nodes inside the current node (as children),
   * they will all be replaced with a singular text node.
   *
   * @param newText The text to substitute for the old one.
   */
  replaceText: (newText: string) => void;
}
type DomContents = ContentsBuilder<any, DomImmediateUtils>;
type DomImmediate<N extends Node> = Immediate<N, DomImmediateUtils>;
type DomImmediateFragment = Immediate<MutableFragment, DomImmediateUtils>;
type DomImmediateFragmentCallback = (frag: DomImmediateFragment) => void;
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
 * @param inner The target element.
 */
declare function immediate<I extends Node>(inner: I): DomImmediate<I>;
/**
 * Get a DOM element and apply immediate mode to it.
 *
 * This function raises when it's not found.
 *
 * @param selector The CSS selector.
 * @returns
 */
declare function select<E extends HTMLElement>(selector: string): DomImmediate<E>;
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
declare function selectAll<const T extends DomImmediate<any>[]>(selector: string): T;
interface Ref<N extends Node> {
  /**
   * Get the underlying immediate mode, in a sense, "dereferencing."
   *
   * @throws A `TypeError` will be thrown if the target is not set.
   */
  get: () => DomImmediate<N>;
  /**
   * Set the given immediate mode as the target of this reference.
   *
   * This also implies a reference target can be mutable.
   */
  set: (mode: DomImmediate<N>) => void;
  inner?: DomImmediate<N>;
}
/**
 * Create a reference to an immediate mode.
 *
 * This is useful when you need to use an immediate mode
 * that's deep down in your code.
 *
 * Use `set()` to set the reference target, and use `get()`
 * to get the underlying immediate mode.
 *
 * ```ts
 * const buttonRef = ref();
 *
 * parent.div((div) => {
 *     const btn = div.button("Hello!");
 *     buttonRef.set(btn);
 * });
 *
 * buttonRef.get().replaceText("Hello, World!");
 * ```
 */
declare function ref<N extends Node>(): Ref<N>;
//#endregion
export { DomContents, DomImmediate, DomImmediateFragment, DomImmediateFragmentCallback, DomImmediateUtils, Ref, immediate, ref, select, selectAll };