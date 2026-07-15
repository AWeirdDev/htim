---
outline: deep
---

# htim
An **HTML Immediate Mode [single-file](https://raw.githubusercontent.com/AWeirdDev/htim/refs/heads/main/index.ts) library**. The main idea is that everything gets rendered onto the DOM as your code execution progresses, and that preprocessing is not needed at all. To keep the entire premise, the API is designed to be lightweight and nothing other than the core idea is included.

However, using this library comes with a great deal of responsibility. A lot of modern (bloated) libraries like React provide features like re-renders, states, hooks, signals, keyed lists, etc., but none are present in this library, which means it's up to you to decide what the logic is. You only get the necessities. Though, you can use your codebase tied with `htim` to show off how good you are at compiling your own UI logic.

**Key features**:
- Small
- Straight-forward
- Immediate results
- Fast
- Strongly typed (with TypeScript)

```ts twoslash
import { type Immediate, getDom } from "@aweirddev/htim";

getDom("#app").and((app: Immediate<HTMLDivElement>) => {
    // This function only runs when `#app` is actually found,
    // thus the wording "and," which signifies "and then"

    app.h1("My App");
    app.p("This gets added to #app as we write.");

    app.ul((ul) => {
        for (let i = 0; i < 10; i++) {
            ul.li(i.toString());
        }
    });
});
```

## Why?
Somtimes you just need a break from all the slop going on out there. You'll either find inner peace or frustration here.
