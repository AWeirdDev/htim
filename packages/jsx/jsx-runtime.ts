import { type Attributes, type Immediate, type ImmediateCallback } from "@htim/primitives";

export declare namespace JSX {
    type Element = ImmediateCallback<any, Record<string, any>>;
    type Children = string | Element | undefined | Children[];

    type Props<K extends keyof HTMLElementTagNameMap> = Attributes<
        HTMLElementTagNameMap[K]
    > & { children?: Children };
    type IntrinsicElements = {
        [K in keyof HTMLElementTagNameMap]: Props<K>;
    };
}

type BaseImmediate = Immediate<any, Record<string, any>>;

const Fragment = Symbol.for("htim.Fragment");

// jump table
type JumpEntry = (immediate: BaseImmediate, item: JSX.Children) => void;
const jmp: Readonly<[Record<string, JumpEntry>, Record<string, JumpEntry>]> = Object.freeze([
    // false (0), not array
    {
        "function": (immediate, item) => {
            immediate.render(item as JSX.Element);
        },
        "string": (immediate, item) => {
            immediate._(item as string);
        }
    },

    // true (1), yes array suka blyatt
    {
        "object": (immediate, item) => {
            resolveChildren(immediate, item as JSX.Children[]);
        }
    },
]);

function resolveChildren(
    immediate: BaseImmediate,
    children: JSX.Children[]
) {
    // gently map to the jump table
    children.forEach((item) => {
        jmp[Number(Array.isArray(item))]![typeof item]!(immediate, item);
    });
}

// currying max'd cause why the hell not
// what you gonna do about it lol
// also this function is one-off, i suppose it's fine.
function jsx(
    type: typeof Fragment | Function | string,
    props: JSX.Props<keyof HTMLElementTagNameMap>
): JSX.Element {
    props.children ??= [];
    const children = Array.isArray(props.children) ? props.children : [props.children];

    const out = <JSX.Element>function (outer) {
        // parent immediate
        const immediate = type === Fragment ? outer.$() : outer;
        resolveChildren(immediate, children);
    };

    return out;
}

export { jsx, jsx as jsxs, Fragment };
