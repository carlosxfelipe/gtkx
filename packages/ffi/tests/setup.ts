import { beforeAll } from "vitest";
import * as Gio from "../src/generated/gio/index.js";
import * as Gtk from "../src/generated/gtk/index.js";
import { registerNativeClass, start } from "../src/index.js";

beforeAll(() => {
    registerNativeClass(Gtk.Application);
    start("com.gtkx.ffi", Gio.ApplicationFlags.NON_UNIQUE);
});
