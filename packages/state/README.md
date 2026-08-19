# @htim/state
**State support for [htim](https://github.com/AWeirdDev/htim).** This package provides `State<T>`, which serves as a simple wrapper over your data. This adds an extra indirection, making internal mutability possible, while keeping things clean and allowing you to subscribe to state updates.

For example, a simple state that keeps track of a count:

```ts
const $count = state<number>(0);

// Get the current value
console.log($count()); // Output: 0

// Subscribe to updates
$count.subscribe((count: number) => {
    console.log("Boo!", count);
});

// Update the count, triggering the subscriber
$count.update(1);
$count.updateWith(c => c + 1);

// Output:
// Boo! 1
// Boo! 2
```

> **Tip**: I think it's best that we add a `$` prefix to states so that you can easily tell which is a state, and which isn't. It's only a small convention I like, you can ditch it for your code base if you have other plans.

## Depend on states
You can create states that depend on different states using the `depend()` function.

```ts
const $a = state(0);
const $b = state(0);

// Depend on two states
const $c = depend([$a, $b], (a, b) => a + b);

// Depend on one state
const $d = depend($a, (a) => a.toString());
```

What's interesting is that `depend()` also returns a `State<T>`, which means this can go on forever. You can extend a state value however you like with this utility.

## Re-rendering
For example, a simple counter which replaces the count text every time the user clicks on the button.

```ts
import { select } from "@htim/core";

const app = select("#app");
const $count = state(0);

app.button((button) => {
   button._("Clicks: ");

   const text = button._($count().toString());
   $count.subscribe((count) => {
       text.replaceText(count.toString());
   });

   button.onclick(() => {
       $count.updateWith(c => c + 1);
   });
});
```

Re-render support will be available soon.

## License
MIT or [UNLICENSED](https://unlicense.org/), at your option.
