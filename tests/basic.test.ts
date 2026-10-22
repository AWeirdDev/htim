import { select } from "@htim/core";
import "./_framework";

import { expect, test } from "bun:test";

test("basic", () => {
    select("body").div("hello!");

    expect(
        document.querySelector("body")?.firstChild!.textContent?.trim() ===
            "hello!",
    );
});
