import { bench, describe } from "vitest";
import { drawButtonBox } from "../tests/helpers/button-box.js";
import { cleanup, render } from "../tests/helpers/production-render.js";

const SIZES = [100, 400];

describe("teardown", () => {
    for (const n of SIZES) {
        bench(`mount and unmount a box of ${n} buttons`, async () => {
            await render(drawButtonBox(n));
            await cleanup();
        });
    }
});
