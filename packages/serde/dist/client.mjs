import { __htimSerdeInternals } from "./index.mjs";
import "@htim/core";
//#region src/client.ts
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
* Deserializer for the `imm` format for htim.
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
		const arr = await this.#stream.readBytes(__htimSerdeInternals.__sizeUint32);
		if (!arr) return null;
		return new DataView(arr.buffer, arr.byteOffset, arr.byteLength).getUint32(0, true);
	}
	async readString(bytesLength) {
		const bytes = await this.#stream.readBytes(bytesLength);
		if (!bytes) return null;
		return new TextDecoder().decode(bytes);
	}
};
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
export { deserializeImmStreamTo };
