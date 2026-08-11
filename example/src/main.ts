import "./style.css";

import { select } from "../../";
import { css } from "@emotion/css";

select<HTMLDivElement>("#app").and((app) => {
    const ref = app.div("16:09", {
        class: css({
            position: "absolute",
            fontFamily: "'Inter Tight', sans-serif",
            fontWeight: 800,
            fontSize: "120px",
        }),
    });
    ref.div("yo");
});
