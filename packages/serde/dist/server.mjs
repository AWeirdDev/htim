import { Sink } from "./index.mjs";
import { __htimInternals } from "@htim/core";
//#region src/server.ts
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
		arr.dataView.setUint32(lengthOffset, attributeLength);
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
//#endregion
export { immediateSerializer };
