import { Sink } from "./index.mjs";
import { Immediate } from "@htim/core";
//#region src/server.d.ts
type ServerSideImmediate<E extends HTMLElement> = Immediate<E> & {
  inner: Sink;
};
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
declare function immediateSerializer(): ServerSideImmediate<any>;
//#endregion
export { immediateSerializer };