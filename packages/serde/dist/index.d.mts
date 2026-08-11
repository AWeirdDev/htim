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
type SerImmediate<E extends HTMLElement> = Immediate<E> & {
  inner: Sink;
};
/**
 * Create serializer immediate mode. It behaves nearly identical to
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
declare function serImmediate(): SerImmediate<any>;
/**
 * Asynchronously poll and deserialize the imm (immediate mode module)
 * format from a stream, then append the deserialized nodes to the destination
 * container (`dest`).
 */
declare function deserializeImmStreamTo(stream: ReadableStream, dest: HTMLElement): Promise<void>;
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
//#endregion
export { DynamicUint8Array, SerImmediate, SerdeTag, Sink, deserializeImmStreamTo, serImmediate };