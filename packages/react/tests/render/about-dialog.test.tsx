import * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { AboutDialog, Box } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

describe("render - AboutDialog", () => {
    it("creates AboutDialog widget", async () => {
        const ref = createRef<Gtk.AboutDialog>();

        render(<AboutDialog ref={ref} programName="Test App" />);
        await flushMicrotasks();

        expect(ref.current).not.toBeNull();
    });

    it("does not attach to parent widget tree", async () => {
        const boxRef = createRef<Gtk.Box>();
        const dialogRef = createRef<Gtk.AboutDialog>();

        render(
            <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                <AboutDialog ref={dialogRef} programName="Dialog" />
            </Box>,
        );
        await flushMicrotasks();

        expect(dialogRef.current?.getParent()).toBeNull();
    });

    it("presents on mount", async () => {
        const ref = createRef<Gtk.AboutDialog>();

        render(<AboutDialog ref={ref} programName="Mount Test" />);
        await flushMicrotasks();

        expect(ref.current?.getVisible()).toBe(true);
    });

    it("destroys on unmount", async () => {
        const ref = createRef<Gtk.AboutDialog>();

        function App({ show }: { show: boolean }) {
            return show ? <AboutDialog ref={ref} programName="Unmount Test" /> : null;
        }

        render(<App show={true} />);
        await flushMicrotasks();

        const dialogId = ref.current?.id;
        expect(dialogId).toBeDefined();

        render(<App show={false} />);
        await flushMicrotasks();
    });

    it("sets dialog properties (programName, version, etc.)", async () => {
        const ref = createRef<Gtk.AboutDialog>();

        render(
            <AboutDialog
                ref={ref}
                programName="My Application"
                version="1.0.0"
                copyright="Copyright 2024"
                comments="A test application"
                website="https://example.com"
            />,
        );
        await flushMicrotasks();

        expect(ref.current?.getProgramName()).toBe("My Application");
        expect(ref.current?.getVersion()).toBe("1.0.0");
        expect(ref.current?.getCopyright()).toBe("Copyright 2024");
        expect(ref.current?.getComments()).toBe("A test application");
        expect(ref.current?.getWebsite()).toBe("https://example.com");
    });
});
