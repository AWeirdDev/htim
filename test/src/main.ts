import { type Immediate, getDom } from "../../";

getDom("#app").and((app: Immediate<HTMLDivElement>) => {
    // This function only runs when `#app` is actually found,
    // thus the wording "and," which signals `andThen`

    const h1 = app.h1("My App");
    const p = app.p("This gets added to #app as we write.");

    h1.edit((p) => p.custom("not-youtube", "lolll"));
    p.edit((p) => p.custom("youtube-video", "loly"));
});
