import { select } from "@htim/core";

import { immediateSerializer } from "@htim/serde/server";
import { deserializeImmStreamTo } from "@htim/serde/client";

const ser = immediateSerializer();
ser.div("suka blyatt!", { style: "color: red;" });
ser.$("za one", "za two");
await ser.inner.close();
deserializeImmStreamTo(ser.inner.readable, document.querySelector("#app")!);

select("#app").and((app) => {});
