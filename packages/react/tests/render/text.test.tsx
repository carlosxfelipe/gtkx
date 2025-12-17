import * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Box } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

const getChildLabels = (box: Gtk.Box): string[] => {
    const labels: string[] = [];
    let child = box.getFirstChild();
    while (child) {
        if ("getLabel" in child && typeof child.getLabel === "function") {
            labels.push((child as Gtk.Label).getLabel() ?? "");
        }
        child = child.getNextSibling();
    }
    return labels;
};

describe("render - text instances", () => {
    it("renders string child as Label", async () => {
        const boxRef = createRef<Gtk.Box>();

        render(
            <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                Hello World
            </Box>,
        );
        await flushMicrotasks();

        const labels = getChildLabels(boxRef.current as Gtk.Box);
        expect(labels).toContain("Hello World");
    });

    it("updates Label text when string changes", async () => {
        const boxRef = createRef<Gtk.Box>();

        function App({ text }: { text: string }) {
            return (
                <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                    {text}
                </Box>
            );
        }

        render(<App text="Initial" />);
        await flushMicrotasks();

        expect(getChildLabels(boxRef.current as Gtk.Box)).toContain("Initial");

        render(<App text="Updated" />);
        await flushMicrotasks();

        expect(getChildLabels(boxRef.current as Gtk.Box)).toContain("Updated");
    });

    it("handles empty string", async () => {
        const boxRef = createRef<Gtk.Box>();

        render(
            <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                {""}
            </Box>,
        );
        await flushMicrotasks();

        const labels = getChildLabels(boxRef.current as Gtk.Box);
        expect(labels).toHaveLength(0);
    });

    it("handles unicode text", async () => {
        const boxRef = createRef<Gtk.Box>();

        render(
            <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                你好世界 🌍 مرحبا
            </Box>,
        );
        await flushMicrotasks();

        const labels = getChildLabels(boxRef.current as Gtk.Box);
        expect(labels).toContain("你好世界 🌍 مرحبا");
    });

    it("removes text instance when child removed", async () => {
        const boxRef = createRef<Gtk.Box>();

        function App({ showText }: { showText: boolean }) {
            return (
                <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                    {showText && "Removable Text"}
                </Box>
            );
        }

        render(<App showText={true} />);
        await flushMicrotasks();

        expect(getChildLabels(boxRef.current as Gtk.Box)).toContain("Removable Text");

        render(<App showText={false} />);
        await flushMicrotasks();

        expect(getChildLabels(boxRef.current as Gtk.Box)).not.toContain("Removable Text");
    });

    it("handles multiple text children", async () => {
        const boxRef = createRef<Gtk.Box>();

        render(
            <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                {"First"}
                {"Second"}
                {"Third"}
            </Box>,
        );
        await flushMicrotasks();

        const labels = getChildLabels(boxRef.current as Gtk.Box);
        expect(labels).toContain("First");
        expect(labels).toContain("Second");
        expect(labels).toContain("Third");
    });
});
