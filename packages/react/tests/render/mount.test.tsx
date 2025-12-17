import * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { AboutDialog, Box, Label, Window } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

describe("render - mount", () => {
    it("calls mount() after initial render", async () => {
        const windowRef = createRef<Gtk.Window>();

        render(<Window.Root ref={windowRef} title="Mount Test" />);
        await flushMicrotasks();

        expect(windowRef.current).not.toBeNull();
        expect(windowRef.current?.getVisible()).toBe(true);
    });

    it("Window.mount() calls present()", async () => {
        const windowRef = createRef<Gtk.Window>();

        render(<Window.Root ref={windowRef} title="Present Test" />);
        await flushMicrotasks();

        expect(windowRef.current?.getVisible()).toBe(true);
    });

    it("AboutDialog.mount() calls present()", async () => {
        const dialogRef = createRef<Gtk.AboutDialog>();

        render(<AboutDialog ref={dialogRef} programName="Test App" />);
        await flushMicrotasks();

        expect(dialogRef.current).not.toBeNull();
        expect(dialogRef.current?.getVisible()).toBe(true);
    });

    it("regular widgets have no-op mount()", async () => {
        const labelRef = createRef<Gtk.Label>();
        const boxRef = createRef<Gtk.Box>();

        render(
            <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                <Label ref={labelRef} label="Test" />
            </Box>,
        );
        await flushMicrotasks();

        expect(labelRef.current).not.toBeNull();
        expect(boxRef.current).not.toBeNull();
    });

    it("mount happens after all children are attached", async () => {
        const windowRef = createRef<Gtk.Window>();
        const labelRef = createRef<Gtk.Label>();

        render(
            <Window.Root ref={windowRef} title="With Child">
                <Label ref={labelRef} label="Child Label" />
            </Window.Root>,
        );
        await flushMicrotasks();

        expect(windowRef.current?.getChild()?.id).toEqual(labelRef.current?.id);
    });
});
