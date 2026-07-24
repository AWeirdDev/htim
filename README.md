# htim
An **HTML Immediate Mode [single-file](https://raw.githubusercontent.com/AWeirdDev/htim/refs/heads/main/index.ts) library**. The main idea is that everything gets rendered onto the DOM as your code execution progresses, and that preprocessing is not needed at all. To keep the entire premise, the API is designed to be lightweight and nothing other than the core idea is included.

However, using this library comes with a great deal of responsibility. A lot of modern (bloated) libraries like React provide features like re-renders, states, hooks, signals, keyed lists, etc., but none are present in this library, which means it's up to you to decide what the logic is. You only get the necessities. Though, you can use your codebase tied with `htim` to show off how good you are at compiling your own UI logic.

**Key features**:
- Small
- Straight-forward
- Immediate results
- Fast
- Strongly typed (with TypeScript)

```ts
import { type Immediate, getDom } from "htim";

const app = getDom("#app")

app.h1("My App");
app.p("This gets added to #app as we write.");

app.ul((ul) => {
    for (let i = 0; i < 10; i++) {
        ul.li(i.toString());
    }
});
```

## Documentation
Documentation is not yet available. You can check out the GitHub page for more information, or just read the types and the docstrings attached.

## When & when not to use htim

**TL;DR: Use htim if you can get used to imperative code. Don't use htim if you have an existing code base.**

htim makes working with the DOM feel like writing imperative JavaScript code, and it might not be the best fit for you if you're more of a visual learner or you need to grasp ideas quickly from the code base, which is a common issue when JSX doesn't yet exist. For example, consider the following code:

```js
// 'section' is a <section>
section.div((div) => {
    div.h1("Hello, htim");
    div.p((p) => {
        p._("Edit ");
        p.code("src/main.ts");
        p._(" and see it for yourself");
    });
});
```

It is equivalent to the following HTML code:

```html
<section>
    <div>
        <h1>Hello, htim</h1>
        <p>Edit <code>src/main.ts</code> and see it for yourself</p>
    </div>
</section>
```

htim code feels more concise, but in our minds, it can't be easily mapped directly to the equivalent HTML code, not to mention JSX code which mixes JavaScript and HTML. Thus, it's only best for you to try out htim if you can actually get used to this, otherwise it might be quite difficult to focus on what matters.

Besides code style, it's also worth mentioning that you shouldn't be using htim if you have an existing code base. For example, a rewrite or a port to htim might take an extra amount of hours manually, and it might not always be the right choice. If you want to use htim on top of a web project, you have to remember that htim depends heavily on the DOM, not a virtual DOM, so anything that breaks the DOM breaks htim.

Finally, htim is still in development, and breaking changes might occur in [major version zero](https://semver.org/) (`0.X.X`). It's not yet suitable for production.

## License
MIT or [UNLICENSED](https://unlicense.org/), at your option.

For details, check the bottom of the [source code](https://raw.githubusercontent.com/AWeirdDev/htim/refs/heads/main/index.ts) of this library.
