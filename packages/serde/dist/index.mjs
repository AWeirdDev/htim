//#region src/index.ts
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
	writeUint8(n) {
		this.reserve(this.count + SIZE_UINT8);
		this.dataView.setUint8(this.count, n);
		this.count += SIZE_UINT8;
	}
	writeUint32(n) {
		this.reserve(this.count + SIZE_UINT32);
		this.dataView.setUint32(this.count, n, true);
		this.count += SIZE_UINT32;
	}
	pack() {
		return new Uint8Array(this.#buffer.slice(0, this.count));
	}
};
let __htimSerdeInternals;
(function(__htimSerdeInternals2) {
	__htimSerdeInternals2.__sizeUint8 = SIZE_UINT8;
	__htimSerdeInternals2.__sizeUint32 = SIZE_UINT32;
})(__htimSerdeInternals || (__htimSerdeInternals = {}));
//#endregion
export { DynamicUint8Array, SerdeTag, Sink, __htimSerdeInternals };
