/*
    htim serde -- v0.0.1 -- Public Domain - https://github.com/AWeirdDev/htim

    (De)serialization library for the HTML immediate mode library, htim.

    This package provides a few components, split by core, client, and server:

    - core:
      - Sink: A sink of buffers which can be turned into a stream.
      - DynamicUint8Array: A dynamically resizable array for uint8.
      - (type) SerdeTag: Tag union for serialization and deserialization.

    - server:
      - immediateSerializer(): Immediate mode serializer
 */

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

    writeUint8(n: number) {
        this.reserve(this.count + SIZE_UINT8);
        this.dataView.setUint8(this.count, n);
        this.count += SIZE_UINT8;
    }

    writeUint32(n: number) {
        this.reserve(this.count + SIZE_UINT32);
        this.dataView.setUint32(this.count, n, /* littleEndian: */ true);
        this.count += SIZE_UINT32;
    }

    pack(): Uint8Array {
        return new Uint8Array(this.#buffer.slice(0, this.count));
    }
}

export namespace __htimSerdeInternals {
    // re-exports
    export const __sizeUint8 = SIZE_UINT8;
    export const __sizeUint32 = SIZE_UINT32;
}
