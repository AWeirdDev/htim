import { createImmediateFactory, type ContentsBuilder, type Immediate } from "@htim/primitives";

import { SerdeTag, SIZE_UINT32, SIZE_UINT8 } from "./format";

const MAX_BYTE_LENGTH: number = 2 << 10; // 2kB (less than 2^32, so it's ok)
const INITIAL_BYTE_LENGTH: number = 8;   // 8B, fairly sufficient

export type SerImmediate = Immediate<Sink, {}>;

export class Sink {
    readonly readable: ReadableStream<Uint8Array>;
    arrays: (Uint8Array | DynamicUint8Array)[];

    #controller!: TransformStreamDefaultController<Uint8Array>;
    #writer: WritableStreamDefaultWriter<void>;

    constructor() {
        const ts = new TransformStream<void, Uint8Array>({
            start: (controller) => {
                this.#controller = controller;
            },
            transform() {},
        });

        this.readable = ts.readable;

        this.#writer = ts.writable.getWriter();
        this.arrays = [];
    }

    pushArrays(...bufs: (Uint8Array | DynamicUint8Array)[]) {
        this.arrays.push(...bufs) - 1;
    }

    lastArray(): Uint8Array | DynamicUint8Array | null {
        return this.arrays[this.arrays.length - 1] || null;
    }

    /**
     * Gets the last dynamic array.
     *
     * If the last array is undefined or a normal Uint8Array, a
     * new `DynamicUint8Array` will be pushed.
     */
    pushOrGetLastDynamicArray(): DynamicUint8Array {
        const last = this.lastArray();
        if (last instanceof DynamicUint8Array) return last;

        const arr = new DynamicUint8Array();
        this.pushArrays(arr);
        return arr;
    }

    async flush() {
        await this.#writer.ready;

        for (let i = 0; i < this.arrays.length; i++) {
            let buf = this.arrays[i];
            if (buf instanceof DynamicUint8Array) buf = buf.pack();
            this.#controller.enqueue(buf);
        }
        this.arrays = [];
    }

    async close() {
        await this.flush();
        await this.#writer.close();
    }
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
export class DynamicUint8Array {
    readonly dataView: DataView;
    count: number;

    #buffer: ArrayBuffer;

    constructor(initialCapacity?: number) {
        this.count = 0;
        this.#buffer = new ArrayBuffer(initialCapacity || 0, {
            maxByteLength: MAX_BYTE_LENGTH,
        });

        this.dataView = new DataView(this.#buffer);
    }

    reserve(expectedCapacity: number) {
        // we cannot initialize undefined memory like C
        // js already zero-initializes memory for us
        let capacity = this.#buffer.byteLength;

        if (capacity === 0) {
            capacity = INITIAL_BYTE_LENGTH;
        }

        while (expectedCapacity > capacity) {
            capacity *= 2;
        }

        if ("resize" in ArrayBuffer.prototype) {
            this.#buffer.resize(capacity);
        } else {
            // ArrayBuffer.resize() isn't widely available, it's marked as "newly available."
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/resize
            //
            // NOTE: it's newly available in July, 2024. We should update this once it's widely
            //       available, which is rather soon
            //
            //
            // https://stackoverflow.com/questions/18600895
            // --------------------------------------------
            //
            // According to @dmitry:
            //
            //   new Uint8Array(newBuffer).set(new Uint8Array(oldBuffer))
            //
            // This should work generally.

            const newBuffer = new ArrayBuffer(capacity); // maxByteLength not supported
            new Uint8Array(newBuffer).set(new Uint8Array(this.#buffer));

            this.#buffer = newBuffer;
        }
    }

    /**
     * Write a byte to the buffer.
     */
    writeUint8(n: number) {
        this.reserve(this.count + SIZE_UINT8);
        this.dataView.setUint8(this.count, n);
        this.count += SIZE_UINT8;
    }

    /**
     * Write an unsigned 32 integer to the buffer in the little endian format.
     */
    writeUint32(n: number) {
        this.reserve(this.count + SIZE_UINT32);
        this.dataView.setUint32(this.count, n, /* littleEndian: */ true);
        this.count += SIZE_UINT32;
    }

    /**
     * Get a slice of the array that's the exact length of the current `count`.
     * This is similar to the `shrink()` function in various implementations of
     * dynamic arrays, but this one is guaranteed to never copy data.
     *
     * This is cheap because only references are passed, and the JavaScript
     * garbage collector will take care of the lifetime of the original array.
     */
    pack(): Uint8Array {
        return new Uint8Array(this.#buffer.slice(0, this.count));
    }
}

function writeContents(
    sink: Sink,
    contents: ContentsBuilder<any, any>,
    immediateMode: Immediate<any>,
) {
    // collect
    for (const content of contents) {
        if (typeof content === "string") {
            // text node
            const arr = sink.pushOrGetLastDynamicArray();
            const encoded = encodeUtf8(content.toString());

            arr.writeUint8(SerdeTag.TEXT);
            arr.writeUint32(encoded.byteLength);

            sink.pushArrays(encoded);
        } else if (typeof content === "function") {
            // () => {} triggers
            content(immediateMode);
        } else {
            // attributes
            const arr = sink.pushOrGetLastDynamicArray();
            arr.writeUint8(SerdeTag.ATTRIBUTES);

            const lengthOffset = arr.count;
            arr.writeUint32(0); // placeholder

            const arrays: Uint8Array[] = [];

            const attributeLength = Object.entries(content)
                .map(([key, value]) => {
                    const encodedKey = encodeUtf8(key);
                    const encodedValue = encodeUtf8(value.toString());
                    // TODO: datasets?

                    arr.writeUint32(encodedKey.byteLength);
                    arr.writeUint32(encodedValue.byteLength);
                    arrays.push(encodedKey, encodedValue);
                })
                .reduce((i) => i + 1, 0);

            arr.dataView.setUint32(
                lengthOffset,
                attributeLength,
                /* littleEndian: */ true,
            );
            sink.pushArrays(...arrays);
        }
    }
}

function encodeUtf8(content: string): Uint8Array {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(content.toString());
    return encoded;
}

const SER_IMMEDIATE_HANDLER =
    (target: any, tag: string, rawContents: any[]) => {
        const sink = (target.inner as Sink);

        // text node
        if (tag === "_" || tag === "text") {
            const encoded = encodeUtf8(
                rawContents.map(String).join(" "),
            );

            const arr = sink.pushOrGetLastDynamicArray();
            arr.writeUint8(SerdeTag.TEXT);
            arr.writeUint32(encoded.byteLength);

            sink.pushArrays(encoded);
            return target;
        }

        // fragment
        if (tag === "$" || tag === "fragment") {
            const arr = sink.pushOrGetLastDynamicArray();
            arr.writeUint8(SerdeTag.FRAGMENT);

            const immediateMode = serImmediate();
            writeContents(sink, rawContents, immediateMode);

            sink.pushOrGetLastDynamicArray().writeUint8(
                SerdeTag.RENDERUP,
            );
            return immediateMode;
        }

        // element
        const elementTag =
            tag === "custom" ? rawContents[0]!.toString() : tag;
        const encodedTag = encodeUtf8(elementTag);

        const arr = sink.pushOrGetLastDynamicArray();
        arr.writeUint8(SerdeTag.ELEMENT);
        arr.writeUint32(encodedTag.byteLength);
        sink.pushArrays(encodedTag);

        const contents =
            tag === "custom" ? rawContents.slice(1) : rawContents;

        const immediateMode = serImmediate();
        writeContents(sink, contents, immediateMode);

        sink.pushOrGetLastDynamicArray().writeUint8(SerdeTag.RENDERUP);
        return immediateMode;
    };

const SER_IMMEDIATE_FACTORY = createImmediateFactory(SER_IMMEDIATE_HANDLER, {});

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
export function serImmediate(): SerImmediate {
    return SER_IMMEDIATE_FACTORY(new Sink());
}
