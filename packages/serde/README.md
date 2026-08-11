# htim (serde)

**HTML immediate de(serialization) mode for server-side rendering.** This library is really low-level, but you can still use it in your projects if you'd like. The implementations are fairly efficient, and can achieve true streaming through JavaScript streams instead of only depending on dynamically-sized buffers.

For more information, check out [the htim repo](https://github.com/AWeirdDev/htim) or the [core package (@htim/core)](https://www.npmjs.com/package/@htim/core), which explains what's going on with this project.

## At a glance

**Server-side**:

```ts
import { serImmediate } from "@htim/serde";

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
import { select } from "@htim/core";
import { deserializeImmStreamTo } from "@htim/serde";

const root = select("#app");
deserializeImmStreamTo(readableStream, root());
```

## License
MIT or [UNLICENSED](https://unlicense.org/), at your option.
