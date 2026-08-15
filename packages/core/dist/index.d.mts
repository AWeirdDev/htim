import { Immediate } from "@htim/primitives";
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
}
type ImmediateFragment = Immediate<MutableFragment, DomImmediateUtils>;
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
 * @param inner The target element.
 */
declare function immediate<I extends HTMLElement>(inner: I): Immediate<I, DomImmediateUtils>;
/**
 * Get a DOM element and apply immediate mode to it.
 *
 * This function raises when it's not found.
 *
 * @param selector The CSS selector.
 * @returns
 */
declare function select<E extends HTMLElement>(selector: string): Immediate<E, DomImmediateUtils>;
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
declare function selectAll<const T extends Immediate<any>[]>(selector: string): T;
//#endregion
export { DomImmediateUtils, ImmediateFragment, ImmediateFragmentCallback, immediate, select, selectAll };