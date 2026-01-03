import { start } from "@gtkx/ffi";
import * as Gio from "@gtkx/ffi/gio";
import { beforeAll } from "vitest";

beforeAll(() => {
    start("org.gtkx.css", Gio.ApplicationFlags.NON_UNIQUE);
});
