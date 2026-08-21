import { SerdeTag, SIZE_UINT32 } from "./format";

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
