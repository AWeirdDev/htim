//#region src/index.d.ts
declare enum SerdeTag {
  TEXT = 0,
  FRAGMENT = 1,
  ELEMENT = 2,
  ATTRIBUTES = 3,
  RENDERUP = 4
}
declare class Sink {
  #private;
  readonly readable: ReadableStream<Uint8Array>;
  arrays: (Uint8Array | DynamicUint8Array)[];
  constructor();
  pushArrays(...bufs: (Uint8Array | DynamicUint8Array)[]): void;
  lastArray(): Uint8Array | DynamicUint8Array | null;
  /**
   * Gets the last dynamic array.
   *
   * If the last array is undefined or a normal Uint8Array, a
   * new `DynamicUint8Array` will be pushed.
   */
  pushOrGetLastDynamicArray(): DynamicUint8Array;
  flush(): Promise<void>;
  close(): Promise<void>;
}
declare class DynamicUint8Array {
  #private;
  readonly dataView: DataView;
  count: number;
  constructor(initialCapacity?: number);
  reserve(expectedCapacity: number): void;
  writeUint8(n: number): void;
  writeUint32(n: number): void;
  pack(): Uint8Array;
}
declare namespace __htimSerdeInternals {
  const __sizeUint8: number;
  const __sizeUint32: number;
}
//#endregion
export { DynamicUint8Array, SerdeTag, Sink, __htimSerdeInternals };