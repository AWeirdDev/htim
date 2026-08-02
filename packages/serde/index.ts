/*
    htim serde -- v0.0.1 -- Public Domain - https://github.com/AWeirdDev/htim

    (De)serialization library for the HTML immediate mode library, htim.
 */

import {
    __htimInternals,
    type Contents,
    type Immediate,
    type ImmediateCallback,
} from "@htim/core";

const MAX_BYTE_LENGTH: number = 1024 * 1024 * 1024 * 1; // 1GiB
const INITIAL_BYTE_LENGTH: number = 8;

const SIZE_UINT8: number = 8 / 8;
const SIZE_UINT32: number = 32 / 8;

export enum SerdeTag {
    TEXT = 0,
    FRAGMENT,
    ELEMENT,
    ATTRIBUTES,
    // DOWN,
    RENDERUP,
}

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

type ServerSideImmediate<E extends HTMLElement> = Immediate<E> & {
    inner: Sink;
};

function writeContents(
    sink: Sink,
    contents: Contents<any>,
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
                    const encodedValue = encodeUtf8(value);

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

function makeTagFunc(sink: Sink, tag: string) {
    return (...rawContents: any[]) => {
        // text node
        if (tag === "_" || tag === "text") {
            const encoded = encodeUtf8(rawContents.map(String).join(" "));

            const arr = sink.pushOrGetLastDynamicArray();
            arr.writeUint8(SerdeTag.TEXT);
            arr.writeUint32(encoded.byteLength);

            sink.pushArrays(encoded);
            return;
        }

        if (tag === "$" || tag === "fragment") {
            const arr = sink.pushOrGetLastDynamicArray();
            arr.writeUint8(SerdeTag.FRAGMENT);
            // arr.writeUint8(SerdeTag.DOWN);
            writeContents(sink, rawContents, immediateSerializer());
            sink.pushOrGetLastDynamicArray().writeUint8(SerdeTag.RENDERUP);
            return;
        }

        const elementTag = tag === "custom" ? rawContents[0].toString() : tag;
        const encodedTag = encodeUtf8(elementTag);

        const arr = sink.pushOrGetLastDynamicArray();
        arr.writeUint8(SerdeTag.ELEMENT);
        arr.writeUint32(encodedTag.byteLength);
        sink.pushArrays(encodedTag);

        // sink.pushOrGetLastDynamicArray().writeUint8(SerdeTag.DOWN);

        const contents = tag === "custom" ? rawContents.slice(1) : rawContents;
        const immediateMode = immediateSerializer();
        writeContents(sink, contents, immediateMode);

        sink.pushOrGetLastDynamicArray().writeUint8(SerdeTag.RENDERUP);
        return;
    };
}

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
export function immediateSerializer(): ServerSideImmediate<any> {
    const res = Object.assign(
        function () {
            throw unavailableError("element");
        },
        {
            inner: new Sink(),
            element: null,
            and(cb: ImmediateCallback<any>) {
                cb(this as any);
                return this;
            },
            replace() {
                throw unavailableError("replace");
            },
            clear() {
                throw unavailableError("clear");
            },
            remove() {
                throw unavailableError("remove");
            },
        },
    );

    return new Proxy(res, {
        get(target, prop) {
            if (typeof prop === "symbol") return undefined;
            if (__htimInternals.immediateFragInteralFields.includes(prop))
                return Reflect.get(target, prop);

            return makeTagFunc(Reflect.get(target, "inner"), prop);
        },
    }) as any;
}

function encodeUtf8(content: string): Uint8Array {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(content.toString());
    return encoded;
}

function unavailableError(feature: string) {
    return new Error(`${feature} is not available in server context`);
}

/**
 * An asynchronous reader capable of getting bytes from a stream
 * (`ReadableStream`) with data that's possibly split between chunks.
 *
 * In the best case scenario where the requested amount of bytes fit
 * inside the current chunk, it returns a slice instead of copying;
 * in the worst case scenario where the requested amount of bytes
 * doesn't fit, it copies data to a buffer and returns it.
 *
 * If you have a continuous block of memory (usually a big buffer),
 * just turn it into a stream and then use this reader, but I suppose
 * there won't be this scenario in the future.
 */
class ChunksStreamReader {
    #reader: ReadableStreamDefaultReader<Uint8Array>;
    #chunk!: Uint8Array;
    #remaining: number;
    #offset: number;

    constructor(stream: ReadableStream) {
        this.#reader = stream.getReader();
        this.#remaining = 0;
        this.#offset = 0;
    }

    async poll(): Promise<Uint8Array | null> {
        const { done, value } = await this.#reader.read();
        if (done) return ((this.#remaining = 0), null);

        this.#chunk = value;
        this.#remaining = this.#chunk.byteLength;
        this.#offset = 0;
        return value;
    }

    advanceBytes(n: number) {
        this.#remaining -= n;
        this.#offset += n;
    }

    async readByte(): Promise<number | null> {
        while (this.#remaining <= 0) {
            if (!(await this.poll())) return null;
        }

        const byte = this.#chunk[this.#offset]!;
        this.advanceBytes(1);
        return byte;
    }

    async readBytes(targetLength: number): Promise<Uint8Array | null> {
        if (targetLength <= this.#remaining) {
            const subarr = this.#chunk.subarray(
                this.#offset,
                this.#offset + targetLength,
            );
            this.advanceBytes(targetLength);
            return subarr;
        }

        let consumed = 0;
        const result = new Uint8Array(targetLength);

        while (consumed < targetLength) {
            if (!(await this.poll())) return null;

            const arr = this.#chunk.subarray(0, targetLength - consumed);
            result.set(arr, consumed);

            consumed += arr.byteLength;
            this.advanceBytes(arr.byteLength);
        }

        return result;
    }
}

/**
 * An asynchronous deserializer for the imm (immediate mode module) format.
 *
 * It wraps around `ChunksStreamReader` and uses the `DataView` utility
 * to read data in specific formats.
 */
class ImmDeserializer {
    #stream: ChunksStreamReader;

    constructor(stream: ReadableStream) {
        this.#stream = new ChunksStreamReader(stream);
    }

    async readUint8(): Promise<number | null> {
        return await this.#stream.readByte();
    }

    async readUint32(): Promise<number | null> {
        const arr = await this.#stream.readBytes(SIZE_UINT32);
        if (!arr) return null;

        const dv = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
        return dv.getUint32(0, /* littleEndian: */ true);
    }

    async readString(bytesLength: number): Promise<string | null> {
        const bytes = await this.#stream.readBytes(bytesLength);
        if (!bytes) return null;
        return new TextDecoder().decode(bytes);
    }
}

/**
 * Asynchronously poll and deserialize the imm (immediate mode module)
 * format from a stream, then append the deserialized nodes to the destination
 * container (`dest`).
 */
export async function deserializeImmStreamTo(
    stream: ReadableStream,
    dest: HTMLElement,
): Promise<void> {
    const de = new ImmDeserializer(stream);

    const nodes: Node[] = [dest];
    const nodeIds: number[] = [0];

    for (;;) {
        const serdeTag: SerdeTag | null = await de.readUint8();
        if (serdeTag === null) break;

        switch (serdeTag) {
            /* ELEMENT */
            case SerdeTag.ELEMENT:
                // note: please do NOT make this a one-liner
                // otherwise it's difficult to see what bytes
                // or content types come first.
                const elementTagLength = expect(
                    "tag length",
                    await de.readUint32(),
                );
                const elementTag = expect(
                    "tag",
                    await de.readString(elementTagLength),
                );
                const element = document.createElement(elementTag);
                nodeIds.push(nodes.push(element) - 1);
                break;

            case SerdeTag.FRAGMENT:
                const frag = document.createDocumentFragment();
                nodeIds.push(nodes.push(frag) - 1);
                break;

            case SerdeTag.RENDERUP:
                renderup(nodes, nodeIds);
                break;

            case SerdeTag.ATTRIBUTES:
                const parent =
                    nodes[expect("a parent", nodeIds[nodeIds.length - 1])]!;

                const kvLengths: [number, number][] = [];
                const nAttributes = expect(
                    "attributes length",
                    await de.readUint32(),
                );
                for (let i = 0; i < nAttributes; i++) {
                    kvLengths.push([
                        expect("key length", await de.readUint32()),
                        expect("value length", await de.readUint32()),
                    ]);
                }

                for (const [kLength, vLength] of kvLengths) {
                    try {
                        const key = expect("key", await de.readString(kLength));
                        const value = expect(
                            "value",
                            await de.readString(vLength),
                        );
                        (parent as unknown as HTMLElement).setAttribute(
                            key,
                            value,
                        );
                    } catch {
                        // we cannot bail because there's still data behind
                        // so we'll just keep going
                    }
                }

                break;

            case SerdeTag.TEXT:
                const textLength = expect("text length", await de.readUint32());
                const textData = expect(
                    "text",
                    await de.readString(textLength),
                );
                const doc = document.createTextNode(textData);
                nodes.push(doc);
                break;
        }
    }
    renderup(nodes, nodeIds);
}

function renderup(nodes: Node[], nodeIds: number[]): void {
    const parentNodeId = nodeIds.pop()!;
    const parentNode = nodes[parentNodeId]!;

    for (let id = parentNodeId + 1; id < nodes.length; id++) {
        const node = nodes[id]!;
        parentNode.appendChild(node);
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
    nodes.splice(parentNodeId + 1, nodes.length);
}

function expect<T>(message: string, item: T | null | undefined): T {
    if (item === null || typeof item === "undefined")
        throw new Error(`expected ${message}`);
    return item;
}
