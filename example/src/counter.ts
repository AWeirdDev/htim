import type { Immediate } from "../../";

export function renderCounter(parent: Immediate<any>) {
    parent.button(
        { id: "counter", type: "button", class: "counter" },
        (button) => {
            let counter = 0;

            const setCounter = (count: number) => {
                counter = count;
                button().textContent = `Count is ${counter}`;
            };

            button().addEventListener("click", () => setCounter(counter + 1));
            setCounter(0);
        },
    );
}
