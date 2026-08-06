//#region index.ts
const IMMEDIATE_INTERNAL_FIELDS = [
	"element",
	"replace",
	"and",
	"switch",
	"clear",
	"remove"
];
const IMMEDIATE_FRAG_INTERNAL_FIELDS = [...IMMEDIATE_INTERNAL_FIELDS, "inner"];
function addAttribute(element, key, value) {
	switch (key) {
		case "style":
			element.style = value.toString();
			break;
		case "class":
			if (Array.isArray(value)) element.className = value.map((item) => item?.trim()).filter((token) => token).join(" ");
			else element.className = value.toString();
			break;
		case "dataset":
			if (typeof value !== "object") return;
			Object.entries(value).forEach(([key, value]) => {
				element.dataset[key] = value.toString();
			});
			break;
		default: if (key.startsWith("on")) {
			const eventName = key.slice(2);
			element.addEventListener(eventName, value);
		} else element.setAttribute(key, value.toString());
	}
}
function makeTagFunc(tag) {
	return (rawContents) => {
		if (tag === "_" || tag === "text") return { element: document.createTextNode(rawContents.map(String).join(" ")) };
		if (tag === "$" || tag === "fragment") {
			const start = document.createComment("$");
			const end = document.createComment("/$");
			const immediateMode = immediateFragment(start, end);
			const fragment = document.createDocumentFragment();
			fragment.append(start, end);
			renderContents(fragment, rawContents, immediateMode);
			return {
				element: fragment,
				immediateMode
			};
		}
		const element = document.createElement(tag === "custom" ? rawContents[0] : tag);
		const immediateMode = immediate(element);
		renderContents(element, tag === "custom" ? rawContents.slice(1) : rawContents, immediateMode);
		return {
			element,
			immediateMode
		};
	};
}
function renderContents(node, contents, immediateMode) {
	for (const content of contents) if (typeof content === "string") node.textContent += content.toString();
	else if (typeof content === "function") content(immediateMode);
	else Object.entries(content).find(([key, value]) => {
		try {
			addAttribute(node, key, value);
		} catch {
			return true;
		}
		return false;
	});
}
/**
* A primitive which implements a fragment which can be put onto the DOM
* and still be mutable.
*
* # Details
* This doesn't use `DocumentFragment` because upon putting it
* onto the DOM, it actually pours (i.e., drains) everything out of the
* fragment container, so to make it truly follow the idea of "immediate,"
* we can use comments to keep track of what's going on in the DOM without
* storing anything additional here or making any new elements.
*/
var MutableFragment = class {
	#start;
	#end;
	constructor(start, end) {
		this.#start = start;
		this.#end = end;
	}
	/**
	* Append a node to the fragment body.
	*/
	appendChild(node) {
		this.#start.parentNode.insertBefore(node, this.#end);
	}
	/**
	* Clear all nodes in within this fragment.
	*/
	clear() {
		let node = this.#start.nextSibling;
		while (node != this.#end && node) {
			const next = node.nextSibling;
			node.remove();
			node = next;
		}
	}
	/**
	* Strips both anchors from the DOM.
	*/
	removeAnchors() {
		const parent = this.#start.parentNode;
		parent.removeChild(this.#start);
		parent.removeChild(this.#end);
	}
};
function immediateFragment(start, end) {
	const fragment = Object.assign(function() {
		throw new TypeError("cannot get fragment as an HTMLElement");
	}, {
		inner: new MutableFragment(start, end),
		element: null,
		and(cb) {
			cb(this);
			return this;
		},
		replace(cb) {
			this.inner.clear();
			cb(this);
			return this;
		},
		clear() {
			this.inner.clear();
		},
		remove() {
			this.inner.removeAnchors();
		}
	});
	return new Proxy(fragment, { get(target, prop) {
		if (typeof prop === "symbol") return void 0;
		if (IMMEDIATE_FRAG_INTERNAL_FIELDS.includes(prop)) return Reflect.get(target, prop);
		return (...contents) => {
			const { element, immediateMode } = makeTagFunc(prop)(contents);
			Reflect.get(target, "inner").appendChild(element);
			return immediateMode;
		};
	} });
}
/**
* Apply immediate mode to the provided element.
* The type parameter `E` allows you to specify what type
* of element it is. For example, `HTMLDivElement`.
*
* @param element The target element.
*/
function immediate(element) {
	const res = Object.assign(function() {
		return res.element;
	}, {
		element,
		and(cb) {
			if (!this.element) return this;
			cb(this);
			return this;
		},
		replace(cb) {
			if (!this.element) throw new TypeError("element is null, either it has been replaced or it's not found on the DOM");
			const start = document.createComment("$");
			const end = document.createComment("/$");
			this.element.replaceWith(end);
			end.parentNode.insertBefore(start, end);
			cb(immediateFragment(start, end));
			this.element = null;
		},
		clear() {
			if (!this.element) return;
			this.element.textContent = "";
		},
		remove() {
			this.element?.remove();
		}
	});
	return new Proxy(res, { get(target, prop) {
		if (typeof prop === "symbol") return void 0;
		if (IMMEDIATE_INTERNAL_FIELDS.includes(prop)) return Reflect.get(target, prop);
		return (...contents) => {
			const { element, immediateMode } = makeTagFunc(prop)(contents);
			const parent = Reflect.get(target, "element");
			if (!parent) throw new TypeError("cannot add child: parent is null");
			parent.appendChild(element);
			return immediateMode;
		};
	} });
}
/**
* Get a DOM element and apply immediate mode to it.
*
* This function does **NOT** raise.
*
* You can check if it's successful by checking the `element` field
* in the `Immediate` object, but it's generally discouraged. You
* can either use `.and(...)` to setup a callback if the element
* is found, or just don't use this function and use
* `immediate(element)` to apply immediate mode from an element
* directly instead.
*
* @param selector The CSS selector.
* @returns
*/
function select(selector) {
	return immediate(document.querySelector(selector));
}
/**
* Get multiple DOM elements and put them in immediate mode.
*
* The type parameter allows you to cast the result to an
* array of immediate modes built on specific types of elements.
* For example:
*
* ```ts
* // an array of div elements
* selectAll<Immediate<HTMLDivElement>[]>(".some-divs");
*
* // you're sure what they are: a div and a button.
* // though this is generally discouraged, you can never
* // be that sure most of the time, it really depends
* // on the browser's implementation of querySelectorAll()
* selectAll<[
*   Immediate<HTMLDivElement>,
*   Immediate<HTMLButtonElement>
* ]>(".some-class");
* ```
*
* @param selector The CSS selector.
*/
function selectAll(selector) {
	return Array.from(document.querySelectorAll(selector)).map(immediate);
}
let __htimInternals;
(function(__htimInternals2) {
	__htimInternals2.immediateInternalFields = IMMEDIATE_INTERNAL_FIELDS;
	__htimInternals2.immediateFragInteralFields = IMMEDIATE_FRAG_INTERNAL_FIELDS;
	__htimInternals2.mutableFragment = MutableFragment;
})(__htimInternals || (__htimInternals = {}));
//#endregion
export { __htimInternals, immediate, select, selectAll };
