/*
    htim serde -- v0.0.1 -- Public Domain - https://github.com/AWeirdDev/htim

    (De)serialization library for the HTML immediate mode library, htim.
 */

import { immediate, type Immediate } from "@htim/core";

type ImmediateBuffer<E extends HTMLElement> = Immediate<E>;

const MAX_BYTE_LENGTH: number = 1024 * 1024 * 1024 * 1; // 1GiB
const INITIAL_BYTE_LENGTH: number = 128;

class ImmediateSink {
    #buffer: ArrayBuffer;
    #view: DataView;

    constructor(maxByteLength?: number) {
        this.#buffer = new ArrayBuffer(0, {
            maxByteLength: maxByteLength || MAX_BYTE_LENGTH,
        });
        this.#view = new DataView(this.#buffer);
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
            this.#view = new DataView(newBuffer);
        }
    }

    getImmediateBuffer() {}
}

// function createImmediateBuffer(): Immediate<any> {}
