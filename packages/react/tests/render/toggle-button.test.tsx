import type * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { ToggleButton } from "../../src/index.js";
import { fireEvent, flushMicrotasks, render } from "../setup.js";

describe("render - ToggleButton", () => {
    it("creates ToggleButton widget", async () => {
        const ref = createRef<Gtk.ToggleButton>();

        render(<ToggleButton.Root ref={ref} label="Toggle" />);
        await flushMicrotasks();

        expect(ref.current).not.toBeNull();
    });

    it("sets active state via active prop", async () => {
        const ref = createRef<Gtk.ToggleButton>();

        render(<ToggleButton.Root ref={ref} active={true} label="Active" />);
        await flushMicrotasks();

        expect(ref.current?.getActive()).toBe(true);
    });

    it("updates active state when prop changes", async () => {
        const ref = createRef<Gtk.ToggleButton>();

        function App({ active }: { active: boolean }) {
            return <ToggleButton.Root ref={ref} active={active} label="Toggle" />;
        }

        render(<App active={false} />);
        await flushMicrotasks();

        expect(ref.current?.getActive()).toBe(false);

        render(<App active={true} />);
        await flushMicrotasks();

        expect(ref.current?.getActive()).toBe(true);
    });

    it("calls onToggled when toggled", async () => {
        const ref = createRef<Gtk.ToggleButton>();
        const onToggled = vi.fn();

        render(<ToggleButton.Root ref={ref} onToggled={onToggled} label="Toggle" />);
        await flushMicrotasks();

        await fireEvent(ref.current as Gtk.Widget, "toggled");

        expect(onToggled).toHaveBeenCalledTimes(1);
    });
});
