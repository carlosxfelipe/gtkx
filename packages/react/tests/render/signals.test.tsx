import type * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button, Entry, Switch } from "../../src/index.js";
import { fireEvent, flushMicrotasks, render } from "../setup.js";

describe("render - signals", () => {
    describe("connection", () => {
        it("connects onClicked handler to clicked signal", async () => {
            const handleClick = vi.fn();
            const ref = createRef<Gtk.Button>();

            render(<Button ref={ref} onClicked={handleClick} label="Click" />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            await fireEvent(ref.current as Gtk.Widget, "clicked");

            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it("connects onActivate handler to activate signal", async () => {
            const handleActivate = vi.fn();
            const ref = createRef<Gtk.Entry>();

            render(<Entry ref={ref} onActivate={handleActivate} />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            await fireEvent(ref.current as Gtk.Widget, "activate");

            expect(handleActivate).toHaveBeenCalledTimes(1);
        });

        it("connects onStateSet handler to state-set signal", async () => {
            const handleStateSet = vi.fn(() => false);
            const ref = createRef<Gtk.Switch>();

            render(<Switch ref={ref} onStateSet={handleStateSet} />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            await fireEvent(ref.current as Gtk.Widget, "state-set", {
                type: { type: "boolean" },
                value: true,
            });

            expect(handleStateSet).toHaveBeenCalledTimes(1);
        });
    });

    describe("disconnection", () => {
        it("disconnects handler when prop removed", async () => {
            const handleClick = vi.fn();
            const ref = createRef<Gtk.Button>();

            function App({ hasHandler }: { hasHandler: boolean }) {
                return <Button ref={ref} onClicked={hasHandler ? handleClick : undefined} label="Click" />;
            }

            render(<App hasHandler={true} />);
            await flushMicrotasks();

            await fireEvent(ref.current as Gtk.Widget, "clicked");
            expect(handleClick).toHaveBeenCalledTimes(1);

            render(<App hasHandler={false} />);
            await flushMicrotasks();

            await fireEvent(ref.current as Gtk.Widget, "clicked");
            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it("disconnects handler when widget unmounted", async () => {
            const handleClick = vi.fn();
            const ref = createRef<Gtk.Button>();

            function App({ showButton }: { showButton: boolean }) {
                return showButton ? <Button ref={ref} onClicked={handleClick} label="Click" /> : null;
            }

            render(<App showButton={true} />);
            await flushMicrotasks();

            const button = ref.current;
            await fireEvent(button as Gtk.Widget, "clicked");
            expect(handleClick).toHaveBeenCalledTimes(1);

            render(<App showButton={false} />);
            await flushMicrotasks();
        });
    });

    describe("updates", () => {
        it("replaces handler when function reference changes", async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            const ref = createRef<Gtk.Button>();

            function App({ useHandler1 }: { useHandler1: boolean }) {
                return <Button ref={ref} onClicked={useHandler1 ? handler1 : handler2} label="Click" />;
            }

            render(<App useHandler1={true} />);
            await flushMicrotasks();

            await fireEvent(ref.current as Gtk.Widget, "clicked");
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).not.toHaveBeenCalled();

            render(<App useHandler1={false} />);
            await flushMicrotasks();

            await fireEvent(ref.current as Gtk.Widget, "clicked");
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it("maintains handler when function reference is stable", async () => {
            const handleClick = vi.fn();
            const ref = createRef<Gtk.Button>();

            function App({ label }: { label: string }) {
                return <Button ref={ref} onClicked={handleClick} label={label} />;
            }

            render(<App label="First" />);
            await flushMicrotasks();

            render(<App label="Second" />);
            await flushMicrotasks();

            await fireEvent(ref.current as Gtk.Widget, "clicked");
            expect(handleClick).toHaveBeenCalledTimes(1);
        });
    });

    describe("signal arguments", () => {
        it("receives signal arguments in callback", async () => {
            const handleStateSet = vi.fn(() => false);
            const ref = createRef<Gtk.Switch>();

            render(<Switch ref={ref} onStateSet={handleStateSet} />);
            await flushMicrotasks();

            await fireEvent(ref.current as Gtk.Widget, "state-set", {
                type: { type: "boolean" },
                value: true,
            });

            expect(handleStateSet).toHaveBeenCalledWith(expect.anything(), true);
        });

        it("receives widget as first argument", async () => {
            const handleClick = vi.fn();
            const ref = createRef<Gtk.Button>();

            render(<Button ref={ref} onClicked={handleClick} label="Click" />);
            await flushMicrotasks();

            await fireEvent(ref.current as Gtk.Widget, "clicked");

            expect(handleClick).toHaveBeenCalledWith(ref.current);
        });
    });
});
