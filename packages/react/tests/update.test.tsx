import type * as Gtk from "@gtkx/ffi/gtk";
import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { Button, Label } from "../src/index.js";
import { flushMicrotasks, flushSync, render, update } from "./setup.js";

describe("update", () => {
    it("updates the React tree with new element", async () => {
        const ref1 = createRef<Gtk.Label>();
        const ref2 = createRef<Gtk.Label>();

        render(<Label ref={ref1} label="Initial" />);
        await flushMicrotasks();

        expect(ref1.current?.getLabel()).toBe("Initial");

        flushSync(() => {
            update(<Label ref={ref2} label="Updated" />);
        });
        await flushMicrotasks();

        expect(ref2.current?.getLabel()).toBe("Updated");
    });

    it("preserves widget state across updates", async () => {
        const labelRef = createRef<Gtk.Label>();

        function App({ version }: { version: number }) {
            return <Label ref={labelRef} label={`Version ${version}`} />;
        }

        render(<App version={1} />);
        await flushMicrotasks();

        const originalWidgetId = labelRef.current?.id;

        flushSync(() => {
            update(<App version={2} />);
        });
        await flushMicrotasks();

        expect(labelRef.current?.id).toEqual(originalWidgetId);
        expect(labelRef.current?.getLabel()).toBe("Version 2");
    });

    it("handles complete tree replacement", async () => {
        const labelRef = createRef<Gtk.Label>();
        const buttonRef = createRef<Gtk.Button>();

        render(<Label ref={labelRef} label="Label" />);
        await flushMicrotasks();

        expect(labelRef.current).not.toBeNull();

        flushSync(() => {
            update(<Button ref={buttonRef} label="Button" />);
        });
        await flushMicrotasks();

        expect(buttonRef.current).not.toBeNull();
        expect(buttonRef.current?.getLabel()).toBe("Button");
    });

    it("handles partial tree updates", async () => {
        const label1Ref = createRef<Gtk.Label>();
        const label2Ref = createRef<Gtk.Label>();

        function App({ secondLabel }: { secondLabel: string }) {
            return (
                <>
                    <Label ref={label1Ref} label="Static" />
                    <Label ref={label2Ref} label={secondLabel} />
                </>
            );
        }

        render(<App secondLabel="First" />);
        await flushMicrotasks();

        const staticId = label1Ref.current?.id;

        flushSync(() => {
            update(<App secondLabel="Second" />);
        });
        await flushMicrotasks();

        expect(label1Ref.current?.id).toEqual(staticId);
        expect(label2Ref.current?.getLabel()).toBe("Second");
    });

    it("handles stateful component updates", async () => {
        const labelRef = createRef<Gtk.Label>();
        let setCount: (count: number) => void = () => {};

        function Counter() {
            const [count, _setCount] = useState(0);
            setCount = _setCount;
            return <Label ref={labelRef} label={`Count: ${count}`} />;
        }

        render(<Counter />);
        await flushMicrotasks();

        expect(labelRef.current?.getLabel()).toBe("Count: 0");

        flushSync(() => {
            setCount(5);
        });
        await flushMicrotasks();

        expect(labelRef.current?.getLabel()).toBe("Count: 5");
    });
});
