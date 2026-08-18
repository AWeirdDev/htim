import "./style.css";

import { select } from "@htim/core";
import { lossyBindContext, createContext, tryGetContext } from "@htim/context";

const Theme = createContext<"theme", "dark" | "light">();

const app = lossyBindContext(select("#app"), Theme("dark"));
const div = app.button("CLICK MEH");

const theme = tryGetContext(div, Theme);
console.log(theme);
