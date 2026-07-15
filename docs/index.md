---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "htim"
  text: "HTML immediate mode."
  tagline: Everything gets rendered right away
  actions:
    - theme: brand
      text: Docs
      link: /hello
    - theme: alt
      text: GitHub
      link: https://github.com/AWeirdDev/htim
---

```ts twoslash
import { getDom, type Immediate } from "@aweirddev/htim";

const app: Immediate<HTMLDivElement> = getDom("#app");

app.h1("I render!");
app.a(
    "A link", 
    { style: "color: red;", href: "https://www.man7.org/linux" }
);

app.button(
    "Click me!",
    { onclick: () => alert("boo!") }
);
```
