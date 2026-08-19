import "./style.css";

import { select } from "@htim/core";
import { depend, state } from "@htim/state";

const $count = state(0);
const $text = depend($count, (count) => {
    return "HOLY SHIT it's now " + count
});

const app = select("#app");

app.main((main) => {
    main.h1("Welcome to my site!");

    main.button((button) => {
        const countText = button.text($text());

        $text.subscribe((text) => {
            countText.replaceText(text);
        });

        button.onclick(() => {
            $count.updateWith(c => c + 1);
        })
    });
});
