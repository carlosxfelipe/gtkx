import * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Box, Label, Switch } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

describe("render - props", () => {
    describe("property setting", () => {
        it("sets string properties", async () => {
            const ref = createRef<Gtk.Label>();

            render(<Label ref={ref} label="Test Label" />);
            await flushMicrotasks();

            expect(ref.current?.getLabel()).toBe("Test Label");
        });

        it("sets boolean properties", async () => {
            const ref = createRef<Gtk.Label>();

            render(<Label ref={ref} selectable={true} />);
            await flushMicrotasks();

            expect(ref.current?.getSelectable()).toBe(true);
        });

        it("sets numeric properties", async () => {
            const ref = createRef<Gtk.Label>();

            render(<Label ref={ref} maxWidthChars={20} />);
            await flushMicrotasks();

            expect(ref.current?.getMaxWidthChars()).toBe(20);
        });

        it("sets enum properties", async () => {
            const ref = createRef<Gtk.Box>();

            render(<Box ref={ref} spacing={0} orientation={Gtk.Orientation.VERTICAL} />);
            await flushMicrotasks();

            expect(ref.current?.getOrientation()).toBe(Gtk.Orientation.VERTICAL);
        });
    });

    describe("change detection", () => {
        it("skips update when value unchanged", async () => {
            const ref = createRef<Gtk.Label>();

            function App() {
                return <Label ref={ref} label="Same" />;
            }

            render(<App />);
            await flushMicrotasks();

            const initialId = ref.current?.id;

            render(<App />);
            await flushMicrotasks();

            expect(ref.current?.id).toEqual(initialId);
            expect(ref.current?.getLabel()).toBe("Same");
        });

        it("applies update when value changed", async () => {
            const ref = createRef<Gtk.Label>();

            function App({ text }: { text: string }) {
                return <Label ref={ref} label={text} />;
            }

            render(<App text="Initial" />);
            await flushMicrotasks();
            expect(ref.current?.getLabel()).toBe("Initial");

            render(<App text="Updated" />);
            await flushMicrotasks();
            expect(ref.current?.getLabel()).toBe("Updated");
        });

        it("handles undefined to value transition", async () => {
            const ref = createRef<Gtk.Label>();

            function App({ label }: { label?: string }) {
                return <Label ref={ref} label={label} />;
            }

            render(<App label={undefined} />);
            await flushMicrotasks();

            render(<App label="Now Set" />);
            await flushMicrotasks();

            expect(ref.current?.getLabel()).toBe("Now Set");
        });

        it("handles value to undefined transition", async () => {
            const ref = createRef<Gtk.Label>();

            function App({ label }: { label?: string }) {
                return <Label ref={ref} label={label} />;
            }

            render(<App label="Has Value" />);
            await flushMicrotasks();
            expect(ref.current?.getLabel()).toBe("Has Value");

            render(<App label={undefined} />);
            await flushMicrotasks();
        });
    });

    describe("freezeNotify optimization", () => {
        it("batches multiple property updates", async () => {
            const ref = createRef<Gtk.Label>();

            function App({
                label,
                selectable,
                maxWidthChars,
            }: {
                label: string;
                selectable: boolean;
                maxWidthChars: number;
            }) {
                return <Label ref={ref} label={label} selectable={selectable} maxWidthChars={maxWidthChars} />;
            }

            render(<App label="Initial" selectable={false} maxWidthChars={10} />);
            await flushMicrotasks();

            render(<App label="Updated" selectable={true} maxWidthChars={20} />);
            await flushMicrotasks();

            expect(ref.current?.getLabel()).toBe("Updated");
            expect(ref.current?.getSelectable()).toBe(true);
            expect(ref.current?.getMaxWidthChars()).toBe(20);
        });
    });

    describe("consumed props", () => {
        it("does not pass children prop to widget", async () => {
            const ref = createRef<Gtk.Box>();

            render(
                <Box ref={ref} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                    <Label label="Child" />
                </Box>,
            );
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
        });

        it("handles node-specific consumed props", async () => {
            const ref = createRef<Gtk.Switch>();

            render(<Switch ref={ref} active={true} />);
            await flushMicrotasks();

            expect(ref.current?.getActive()).toBe(true);
        });
    });
});
