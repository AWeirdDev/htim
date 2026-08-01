// Iterative Approach:
// Know when to go up/down, and do shit like this:
//
// IDS_STACK = [0], stores the IDs of these **parents** (only add when DOWN is received), essentially temporary
// NODES_STACK = [], stores all the nodes, when a signal like UP is received, everything before
//                   the last id gets put back to that element (contents = [NodeA(), NodeB()])

import {
    __htimInternals,
    type Contents,
    type Immediate,
    type ImmediateCallback,
} from "@htim/core";

import { Sink, SerdeTag } from ".";

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

// utilities

function encodeUtf8(content: string): Uint8Array {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(content.toString());
    return encoded;
}

function unavailableError(feature: string) {
    return new Error(`${feature} is not available in server context`);
}
