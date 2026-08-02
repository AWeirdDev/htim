import { Immediate } from "@htim/core";
//#region index.d.ts
declare enum SerdeTag {
  TEXT = 0,
  FRAGMENT = 1,
  ELEMENT = 2,
  ATTRIBUTES = 3,
  RENDERUP = 4
}
declare class Sink {
  #private;
  readonly readable: ReadableStream<Uint8Array>;
  arrays: (Uint8Array | DynamicUint8Array)[];
  constructor();
  pushArrays(...bufs: (Uint8Array | DynamicUint8Array)[]): void;
  lastArray(): Uint8Array | DynamicUint8Array | null;
  /**
   * Gets the last dynamic array.
   *
   * If the last array is undefined or a normal Uint8Array, a
   * new `DynamicUint8Array` will be pushed.
   */
  pushOrGetLastDynamicArray(): DynamicUint8Array;
  flush(): Promise<void>;
  close(): Promise<void>;
}
/**
 * A wrapper around an `ArrayBuffer` which serves as a dynamic
 * Uint8Array.
 *
 * We use `count` to keep track of the amount of bytes within
 * the buffer since JavaScript doesn't allow uninitialized memory,
 * thus the byte length of the buffer represents the capacity.
 *
 * The internal structure looks something like this:
 *
 * ```ts
 * interface DynamicUint8Array {
 *     count: number;
 *     buffer: ArrayBuffer;
 * }
 * ```
 */
declare class DynamicUint8Array {
  #private;
  readonly dataView: DataView;
  count: number;
  constructor(initialCapacity?: number);
  reserve(expectedCapacity: number): void;
  /**
   * Write a byte to the buffer.
   */
  writeUint8(n: number): void;
  /**
   * Write an unsigned 32 integer to the buffer in the little endian format.
   */
  writeUint32(n: number): void;
  /**
   * Get a slice of the array that's the exact length of the current `count`.
   * This is similar to the `shrink()` function in various implementations of
   * dynamic arrays, but this one is guaranteed to never copy data.
   *
   * This is cheap because only references are passed, and the JavaScript
   * garbage collector will take care of the lifetime of the original array.
   */
  pack(): Uint8Array;
}
type ServerSideImmediate<E extends HTMLElement> = Immediate<E> & {
  inner: Sink;
};
/**
 * Create a serializer for htim. It behaves nearly identical to
 * `immediate()` from `@htim/core`, but with some features disabled,
 * including `replace()`, `clear()`, and `remove()`, which are
 * exclusively available to a real DOM.
 *
 * This serializer does everything immediately. Namely, it doesn't
 * collect everything at once after nodes are put, it instead collects
 * as you write and abstract the DOM.
 *
 * The format exported is considered `imm` (immediate mode module).
 * See `deserializeImm()` from the `client` module for more information.
 */
declare function immediateSerializer(): ServerSideImmediate<any>;
/**
 * Asynchronously poll and deserialize the imm (immediate mode module)
 * format from a stream, then append the deserialized nodes to the destination
 * container (`dest`).
 */
declare function deserializeImmStreamTo(stream: ReadableStream, dest: HTMLElement): Promise<void>;
//#endregion
export { DynamicUint8Array, SerdeTag, Sink, deserializeImmStreamTo, immediateSerializer };