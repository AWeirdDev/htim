import "./_framework";
import { expect, test } from "bun:test";

import { select } from "@htim/core";
import { bindContext, createContext, getContext } from "..";

test("can bind and recall", () => {
    const Count = createContext<"count", { value: number }>();
    const app = bindContext(select("body"), Count({ value: 0 }));

    const div = app.div("Hello, World!");
    let count = getContext(div, Count);
    count.value++;

    expect(getContext(div, Count).value).toBe(1);
})
