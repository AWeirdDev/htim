import "./style.css";

import { select } from "@htim/core";
import { bindContext, createContext, getContext } from "@htim/context";

const Theme = createContext<"theme", "dark" | "light">();

const app = bindContext(select("#app"), Theme("light"));
const div = app.div("hello, world!");

const theme = getContext(div, Theme);
div._(" theme is", theme);
