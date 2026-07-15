# htim
**HTML immediate mode library**. The main idea is that there's no need for special preprocessing just to render stuff. We can dump everything to the DOM as soon as we can. This library is deliberately close to the native JavaScript API, and no such step as compiling (i.e., transpiling) is needed.

```ts
import { type Immediate, getDom } from "htim";

getDom("#app").and((app: Immediate<HTMLDivElement>) => {
    // This function only runs when `#app` is actually found,
    // thus the wording "and," which signals `andThen`

    app.h1("My App");
    app.p("This gets added to #app as we write.");

    app.ul((ul) => {
        for (let i = 0; i < 10; i++) {
            ul.li(i.toString());
        }
    });
})
```
