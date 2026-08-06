import { select, type Immediate } from "../../";

select("#app").and((div: Immediate<HTMLDivElement>) => {
    let count = 0;

    const frag = div.$();
    frag.p("Hello, World!");

    div.button("Switch!", {
        onclick: () =>
            frag.replace((rpl) => {
                rpl.p("More stuff!");
                rpl.p(count.toString());
                count++;
            }),
    });
});
