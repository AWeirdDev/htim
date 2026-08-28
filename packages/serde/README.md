# htim (serde)

**HTML immediate de(serialization) mode for server-side rendering.** Namely, it allows you to construct HTML pages using an imperative code style exactly like [htim](https://github.com/AWeirdDev/htim), thus no JSX compilation is needed. On the implementation note, instead of using one singular `ArrayBuffer` and put everything in, this library uses the Web Streams API and a dynamically sized buffer (a "vector").

**Server-side**:

```ts
import { serImmediate } from "@htim/serde/server";

// create a new immediate mode module
// for server-side rendering
const imm = serImmediate();

// get the ReadableStream attached to the
// immediate mode module
const readable = imm.inner.readable;

imm.div((div) => {
    imm.p("This gets rendered as we write!");
});
imm.inner.flush();

// ...other elements...

imm.inner.close(); // close the stream
```

**Client-side**:

```ts
import { deserializeImmStreamTo } from "@htim/serde/client";

const root = document.querySelector("#app")!;
deserializeImmStreamTo(readableStream, root);

// new root:
// <div id="app">
//   <div>
//     <p>This gets rendered as we write!</p>
//   </div>
// </div>
```

This could be used as a primitive for server-side rendering if you wish. For the specification (which I don't know how to write by the way) for what gets streamed, is available in `format.ts`.

For more information, check out [the htim repo](https://github.com/AWeirdDev/htim) or the [core package (@htim/core)](https://www.npmjs.com/package/@htim/core), which explains what's going on with this project.

## License
MIT or [UNLICENSED](https://unlicense.org/), at your option.
