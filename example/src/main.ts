import "./style.css";
import typescriptLogo from "./assets/typescript.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";
import { renderCounter } from "./counter.ts";

import { getDom } from "../../";

getDom("#app").and((app) => {
    const section = app.section({ id: "center" });

    section.div({ class: "hero" }, (hero) => {
        hero.img({ src: heroImg, class: "base", width: 170, height: 179 });
        hero.img({
            src: typescriptLogo,
            class: "framework",
            alt: "Typescript Logo",
        });
        hero.img({
            src: viteLogo,
            class: "vite",
            alt: "Vite logo",
        });
    });

    section.div((div) => {
        div.h1("Hello, htim");
        div.p((p) => {
            p._("Edit ");
            p.code("src/main.ts");
            p._(" and see that hot reloading is not supported");
        });

        div.$((fragment) => {
            fragment.p({ dataset: { name: "charlie kirk" } });
        });
    });

    renderCounter(section);
});
