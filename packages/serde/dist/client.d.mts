//#region client.d.ts
/**
 * Asynchronously poll and deserialize the imm (immediate mode module)
 * format from a stream, then append the deserialized nodes to the destination
 * container (`dest`).
 */
declare function deserializeImmStreamTo(stream: ReadableStream, dest: HTMLElement): Promise<void>;
//#endregion
export { deserializeImmStreamTo };