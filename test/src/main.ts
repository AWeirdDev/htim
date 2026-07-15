import { type Immediate, getDom } from "../../";

getDom("#app").and((app: Immediate<HTMLDivElement>) => {
    // This function only runs when `#app` is actually found,
    // thus the wording "and," which signals `andThen`

    app.h1("My App");
    app.p("This gets added to #app as we write.");

    app.ul((ul) => {
        for (let i = 0; i < 10; i++) {
            ul.li(i.toString(), { class: ["red"] });
        }
    });
});
