# htim
An **HTML Immediate Mode single-file ([source code]) library**. The main idea is that everything gets rendered onto the DOM as your code execution progresses, and that preprocessing is not needed at all. To keep the entire premise, the API is designed to be lightweight and nothing other than the core idea is included.

However, using this library comes with a great deal of responsibility. A lot of modern (bloated) libraries like React provide features like re-renders, states, hooks, signals, keyed lists, etc., but none are present in this library, which means it's up to you to decide what the logic is. You only get the necessities. Though, you can use your codebase tied with `htim` to show off how good you are at compiling your own UI logic.

**Key features**:
- Small
- Straight-forward
- Explicit\*
- Immediate results
- Fast
- Strongly typed (with TypeScript)

\* You'll need to write imperative code. See "when & when not to use htim" below for more information.

```ts
import { type Immediate, select } from "@htim/core";

const app = select("#app")

app.h1("My App");
app.p("This gets added to #app as we write.");

app.ul((ul) => {
    for (let i = 0; i < 10; i++) {
        ul.li(i.toString());
    }
});
```

**When & when not to use htim**

Essentially:
- Use htim if you can get used to imperative code.
- Don't use htim if you have an existing code base.

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

## Get htim

- This htim core package is available on [npm](https://www.npmjs.com/package/@htim/core).
- The [source code] is available as single-file.
- You can also directly [get the distribution files in this directory](https://github.com/AWeirdDev/htim/tree/main/dist).
  - Get [JavaScript](https://raw.githubusercontent.com/AWeirdDev/htim/refs/heads/main/dist/index.mjs)
  - Get [TypeScript declaration](https://raw.githubusercontent.com/AWeirdDev/htim/refs/heads/main/dist/index.d.mts)

```sh
# Install from npm (import ... from "@htim/core")
$ npm i @htim/core

# Get the source (import ... from "./htim.ts")
$ wget -O htim.ts https://raw.githubusercontent.com/AWeirdDev/htim/refs/heads/main/index.ts
```

## Availability
<img src="https://web-platform-dx.github.io/assets/img/baseline-widely-icon.svg" alt="widely available" width="24" /> **Widely available**

All JavaScript features should be **widely available**, following the [baseline](https://web-platform-dx.github.io/baseline).

## How-To
This section covers a few commonly used functionalities or features in htim which may come in handy.

### Text nodes
To render a text node, use `.text()` or `._()` (shorthand method):

```js
const div = parent.div();

div._("Here's some number: ");
div.code("123321");
div._(", awesome!");
```

### Fragments
To render a fragment, use `.fragment()` or `.$()` (shorthand method):

```js
const div = parent.div();

// render within context
div.$((frag) => {
    frag.p("Hello!");
    frag.p("More paragraphs!");
})

// bind fragment to a variable
const frag = div.$();
frag.p("Hello, again!");
frag.p("More paragraphs!");
```

For technical details on how this is implemented, see the function `immediateFragment()` and the class `MutableFragment` in the [source code] for more information.

### Replacing nodes

## License
MIT or [UNLICENSED](https://unlicense.org/), at your option.

For details, check the bottom of the [source code] of this library.

[source code]: https://raw.githubusercontent.com/AWeirdDev/htim/refs/heads/main/index.ts
