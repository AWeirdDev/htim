import { __htimInternals } from "@htim/core";
//#region index.ts
const MAX_BYTE_LENGTH = 1024 * 1024 * 1024 * 1;
const INITIAL_BYTE_LENGTH = 8;
const SIZE_UINT8 = 8 / 8;
const SIZE_UINT32 = 32 / 8;
let SerdeTag = /* @__PURE__ */ function(SerdeTag) {
	SerdeTag[SerdeTag["TEXT"] = 0] = "TEXT";
	SerdeTag[SerdeTag["FRAGMENT"] = 1] = "FRAGMENT";
	SerdeTag[SerdeTag["ELEMENT"] = 2] = "ELEMENT";
	SerdeTag[SerdeTag["ATTRIBUTES"] = 3] = "ATTRIBUTES";
	SerdeTag[SerdeTag["RENDERUP"] = 4] = "RENDERUP";
	return SerdeTag;
}({});
var Sink = class {
	readable;
	arrays;
	#controller;
	#writer;
	constructor() {
		const ts = new TransformStream({
			start: (controller) => {
				this.#controller = controller;
			},
			transform() {}
		});
		this.readable = ts.readable;
		this.#writer = ts.writable.getWriter();
		this.arrays = [];
	}
	pushArrays(...bufs) {
		this.arrays.push(...bufs) - 1;
	}
	lastArray() {
		return this.arrays[this.arrays.length - 1] || null;
	}
	/**
	* Gets the last dynamic array.
	*
	* If the last array is undefined or a normal Uint8Array, a
	* new `DynamicUint8Array` will be pushed.
	*/
	pushOrGetLastDynamicArray() {
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
};
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
var DynamicUint8Array = class {
	dataView;
	count;
	#buffer;
	constructor(initialCapacity) {
		this.count = 0;
		this.#buffer = new ArrayBuffer(initialCapacity || 0, { maxByteLength: MAX_BYTE_LENGTH });
		this.dataView = new DataView(this.#buffer);
	}
	reserve(expectedCapacity) {
		let capacity = this.#buffer.byteLength;
		if (capacity === 0) capacity = INITIAL_BYTE_LENGTH;
		while (expectedCapacity > capacity) capacity *= 2;
		if ("resize" in ArrayBuffer.prototype) this.#buffer.resize(capacity);
		else {
			const newBuffer = new ArrayBuffer(capacity);
			new Uint8Array(newBuffer).set(new Uint8Array(this.#buffer));
			this.#buffer = newBuffer;
		}
	}
	/**
	* Write a byte to the buffer.
	*/
	writeUint8(n) {
		this.reserve(this.count + SIZE_UINT8);
		this.dataView.setUint8(this.count, n);
		this.count += SIZE_UINT8;
	}
	/**
	* Write an unsigned 32 integer to the buffer in the little endian format.
	*/
	writeUint32(n) {
		this.reserve(this.count + SIZE_UINT32);
		this.dataView.setUint32(this.count, n, true);
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
	pack() {
		return new Uint8Array(this.#buffer.slice(0, this.count));
	}
};
function writeContents(sink, contents, immediateMode) {
	for (const content of contents) if (typeof content === "string") {
		const arr = sink.pushOrGetLastDynamicArray();
		const encoded = encodeUtf8(content.toString());
		arr.writeUint8(0);
		arr.writeUint32(encoded.byteLength);
		sink.pushArrays(encoded);
	} else if (typeof content === "function") content(immediateMode);
	else {
		const arr = sink.pushOrGetLastDynamicArray();
		arr.writeUint8(3);
		const lengthOffset = arr.count;
		arr.writeUint32(0);
		const arrays = [];
		const attributeLength = Object.entries(content).map(([key, value]) => {
			const encodedKey = encodeUtf8(key);
			const encodedValue = encodeUtf8(value);
			arr.writeUint32(encodedKey.byteLength);
			arr.writeUint32(encodedValue.byteLength);
			arrays.push(encodedKey, encodedValue);
		}).reduce((i) => i + 1, 0);
		arr.dataView.setUint32(lengthOffset, attributeLength, true);
		sink.pushArrays(...arrays);
	}
}
function makeTagFunc(sink, tag) {
	return (...rawContents) => {
		if (tag === "_" || tag === "text") {
			const encoded = encodeUtf8(rawContents.map(String).join(" "));
			const arr = sink.pushOrGetLastDynamicArray();
			arr.writeUint8(0);
			arr.writeUint32(encoded.byteLength);
			sink.pushArrays(encoded);
			return;
		}
		if (tag === "$" || tag === "fragment") {
			sink.pushOrGetLastDynamicArray().writeUint8(1);
			writeContents(sink, rawContents, immediateSerializer());
			sink.pushOrGetLastDynamicArray().writeUint8(4);
			return;
		}
		const encodedTag = encodeUtf8(tag === "custom" ? rawContents[0].toString() : tag);
		const arr = sink.pushOrGetLastDynamicArray();
		arr.writeUint8(2);
		arr.writeUint32(encodedTag.byteLength);
		sink.pushArrays(encodedTag);
		writeContents(sink, tag === "custom" ? rawContents.slice(1) : rawContents, immediateSerializer());
		sink.pushOrGetLastDynamicArray().writeUint8(4);
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
function immediateSerializer() {
	const res = Object.assign(function() {
		throw unavailableError("element");
	}, {
		inner: new Sink(),
		element: null,
		and(cb) {
			cb(this);
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
		}
	});
	return new Proxy(res, { get(target, prop) {
		if (typeof prop === "symbol") return void 0;
		if (__htimInternals.immediateFragInteralFields.includes(prop)) return Reflect.get(target, prop);
		return makeTagFunc(Reflect.get(target, "inner"), prop);
	} });
}
function encodeUtf8(content) {
	return new TextEncoder().encode(content.toString());
}
function unavailableError(feature) {
	return /* @__PURE__ */ new Error(`${feature} is not available in server context`);
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
var ChunksStreamReader = class {
	#reader;
	#chunk;
	#remaining;
	#offset;
	constructor(stream) {
		this.#reader = stream.getReader();
		this.#remaining = 0;
		this.#offset = 0;
	}
	async poll() {
		const { done, value } = await this.#reader.read();
		if (done) return this.#remaining = 0, null;
		this.#chunk = value;
		this.#remaining = this.#chunk.byteLength;
		this.#offset = 0;
		return value;
	}
	advanceBytes(n) {
		this.#remaining -= n;
		this.#offset += n;
	}
	async readByte() {
		while (this.#remaining <= 0) if (!await this.poll()) return null;
		const byte = this.#chunk[this.#offset];
		this.advanceBytes(1);
		return byte;
	}
	async readBytes(targetLength) {
		if (targetLength <= this.#remaining) {
			const subarr = this.#chunk.subarray(this.#offset, this.#offset + targetLength);
			this.advanceBytes(targetLength);
			return subarr;
		}
		let consumed = 0;
		const result = new Uint8Array(targetLength);
		while (consumed < targetLength) {
			if (!await this.poll()) return null;
			const arr = this.#chunk.subarray(0, targetLength - consumed);
			result.set(arr, consumed);
			consumed += arr.byteLength;
			this.advanceBytes(arr.byteLength);
		}
		return result;
	}
};
/**
* An asynchronous deserializer for the imm (immediate mode module) format.
*
* It wraps around `ChunksStreamReader` and uses the `DataView` utility
* to read data in specific formats.
*/
var ImmDeserializer = class {
	#stream;
	constructor(stream) {
		this.#stream = new ChunksStreamReader(stream);
	}
	async readUint8() {
		return await this.#stream.readByte();
	}
	async readUint32() {
		const arr = await this.#stream.readBytes(SIZE_UINT32);
		if (!arr) return null;
		return new DataView(arr.buffer, arr.byteOffset, arr.byteLength).getUint32(0, true);
	}
	async readString(bytesLength) {
		const bytes = await this.#stream.readBytes(bytesLength);
		if (!bytes) return null;
		return new TextDecoder().decode(bytes);
	}
};
/**
* Asynchronously poll and deserialize the imm (immediate mode module)
* format from a stream, then append the deserialized nodes to the destination
* container (`dest`).
*/
async function deserializeImmStreamTo(stream, dest) {
	const de = new ImmDeserializer(stream);
	const nodes = [dest];
	const nodeIds = [0];
	for (;;) {
		const serdeTag = await de.readUint8();
		if (serdeTag === null) break;
		switch (serdeTag) {
			case 2:
				const elementTagLength = expect("tag length", await de.readUint32());
				const elementTag = expect("tag", await de.readString(elementTagLength));
				const element = document.createElement(elementTag);
				nodeIds.push(nodes.push(element) - 1);
				break;
			case 1:
				const frag = document.createDocumentFragment();
				nodeIds.push(nodes.push(frag) - 1);
				break;
			case 4:
				renderup(nodes, nodeIds);
				break;
			case 3:
				const parent = nodes[expect("a parent", nodeIds[nodeIds.length - 1])];
				const kvLengths = [];
				const nAttributes = expect("attributes length", await de.readUint32());
				for (let i = 0; i < nAttributes; i++) kvLengths.push([expect("key length", await de.readUint32()), expect("value length", await de.readUint32())]);
				for (const [kLength, vLength] of kvLengths) try {
					const key = expect("key", await de.readString(kLength));
					const value = expect("value", await de.readString(vLength));
					parent.setAttribute(key, value);
				} catch {}
				break;
			case 0:
				const textLength = expect("text length", await de.readUint32());
				const textData = expect("text", await de.readString(textLength));
				const doc = document.createTextNode(textData);
				nodes.push(doc);
				break;
		}
	}
	renderup(nodes, nodeIds);
}
function renderup(nodes, nodeIds) {
	const parentNodeId = nodeIds.pop();
	const parentNode = nodes[parentNodeId];
	for (let id = parentNodeId + 1; id < nodes.length; id++) {
		const node = nodes[id];
		parentNode.appendChild(node);
	}
	nodes.splice(parentNodeId + 1, nodes.length);
}
function expect(message, item) {
	if (item === null || typeof item === "undefined") throw new Error(`expected ${message}`);
	return item;
}
//#endregion
export { DynamicUint8Array, SerdeTag, Sink, deserializeImmStreamTo, immediateSerializer };
