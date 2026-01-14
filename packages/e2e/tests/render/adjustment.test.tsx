import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkScale, x } from "@gtkx/react";
import { render, waitFor } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

describe("render - Adjustment", () => {
    describe("AdjustmentNode", () => {
        it("creates Adjustment for Scale widget", async () => {
            const ref = createRef<Gtk.Scale>();

            await render(
                <GtkScale ref={ref}>
                    <x.Adjustment value={50} lower={0} upper={100} />
                </GtkScale>,
            );

            expect(ref.current).not.toBeNull();
            const adjustment = ref.current?.getAdjustment();
            expect(adjustment).not.toBeNull();
        });

        it("sets initial value", async () => {
            const ref = createRef<Gtk.Scale>();

            await render(
                <GtkScale ref={ref}>
                    <x.Adjustment value={75} lower={0} upper={100} />
                </GtkScale>,
            );

            const adjustment = ref.current?.getAdjustment();
            expect(adjustment?.getValue()).toBe(75);
        });

        it("sets lower bound", async () => {
            const ref = createRef<Gtk.Scale>();

            await render(
                <GtkScale ref={ref}>
                    <x.Adjustment value={50} lower={10} upper={100} />
                </GtkScale>,
            );

            const adjustment = ref.current?.getAdjustment();
            expect(adjustment?.getLower()).toBe(10);
        });

        it("sets upper bound", async () => {
            const ref = createRef<Gtk.Scale>();

            await render(
                <GtkScale ref={ref}>
                    <x.Adjustment value={50} lower={0} upper={200} />
                </GtkScale>,
            );

            const adjustment = ref.current?.getAdjustment();
            expect(adjustment?.getUpper()).toBe(200);
        });

        it("sets step increment", async () => {
            const ref = createRef<Gtk.Scale>();

            await render(
                <GtkScale ref={ref}>
                    <x.Adjustment value={50} lower={0} upper={100} stepIncrement={5} />
                </GtkScale>,
            );

            const adjustment = ref.current?.getAdjustment();
            expect(adjustment?.getStepIncrement()).toBe(5);
        });

        it("sets page increment", async () => {
            const ref = createRef<Gtk.Scale>();

            await render(
                <GtkScale ref={ref}>
                    <x.Adjustment value={50} lower={0} upper={100} pageIncrement={20} />
                </GtkScale>,
            );

            const adjustment = ref.current?.getAdjustment();
            expect(adjustment?.getPageIncrement()).toBe(20);
        });

        it("sets page size", async () => {
            const ref = createRef<Gtk.Scale>();

            await render(
                <GtkScale ref={ref}>
                    <x.Adjustment value={50} lower={0} upper={100} pageSize={10} />
                </GtkScale>,
            );

            const adjustment = ref.current?.getAdjustment();
            expect(adjustment?.getPageSize()).toBe(10);
        });

        it("updates value when prop changes", async () => {
            const ref = createRef<Gtk.Scale>();

            function App({ value }: { value: number }) {
                return (
                    <GtkScale ref={ref}>
                        <x.Adjustment value={value} lower={0} upper={100} />
                    </GtkScale>
                );
            }

            await render(<App value={25} />);
            expect(ref.current?.getAdjustment()?.getValue()).toBe(25);

            await render(<App value={75} />);
            expect(ref.current?.getAdjustment()?.getValue()).toBe(75);
        });

        it("updates lower bound when prop changes", async () => {
            const ref = createRef<Gtk.Scale>();

            function App({ lower }: { lower: number }) {
                return (
                    <GtkScale ref={ref}>
                        <x.Adjustment value={50} lower={lower} upper={100} />
                    </GtkScale>
                );
            }

            await render(<App lower={0} />);
            expect(ref.current?.getAdjustment()?.getLower()).toBe(0);

            await render(<App lower={20} />);
            expect(ref.current?.getAdjustment()?.getLower()).toBe(20);
        });

        it("updates upper bound when prop changes", async () => {
            const ref = createRef<Gtk.Scale>();

            function App({ upper }: { upper: number }) {
                return (
                    <GtkScale ref={ref}>
                        <x.Adjustment value={50} lower={0} upper={upper} />
                    </GtkScale>
                );
            }

            await render(<App upper={100} />);
            expect(ref.current?.getAdjustment()?.getUpper()).toBe(100);

            await render(<App upper={200} />);
            expect(ref.current?.getAdjustment()?.getUpper()).toBe(200);
        });

        it("updates step increment when prop changes", async () => {
            const ref = createRef<Gtk.Scale>();

            function App({ stepIncrement }: { stepIncrement: number }) {
                return (
                    <GtkScale ref={ref}>
                        <x.Adjustment value={50} lower={0} upper={100} stepIncrement={stepIncrement} />
                    </GtkScale>
                );
            }

            await render(<App stepIncrement={1} />);
            expect(ref.current?.getAdjustment()?.getStepIncrement()).toBe(1);

            await render(<App stepIncrement={5} />);
            expect(ref.current?.getAdjustment()?.getStepIncrement()).toBe(5);
        });

        it("updates page increment when prop changes", async () => {
            const ref = createRef<Gtk.Scale>();

            function App({ pageIncrement }: { pageIncrement: number }) {
                return (
                    <GtkScale ref={ref}>
                        <x.Adjustment value={50} lower={0} upper={100} pageIncrement={pageIncrement} />
                    </GtkScale>
                );
            }

            await render(<App pageIncrement={10} />);
            expect(ref.current?.getAdjustment()?.getPageIncrement()).toBe(10);

            await render(<App pageIncrement={25} />);
            expect(ref.current?.getAdjustment()?.getPageIncrement()).toBe(25);
        });

        it("uses default values when not specified", async () => {
            const ref = createRef<Gtk.Scale>();

            await render(
                <GtkScale ref={ref}>
                    <x.Adjustment />
                </GtkScale>,
            );

            const adjustment = ref.current?.getAdjustment();
            expect(adjustment?.getValue()).toBe(0);
            expect(adjustment?.getLower()).toBe(0);
            expect(adjustment?.getUpper()).toBe(100);
            expect(adjustment?.getStepIncrement()).toBe(1);
            expect(adjustment?.getPageIncrement()).toBe(10);
            expect(adjustment?.getPageSize()).toBe(0);
        });

        it("connects onValueChange callback", async () => {
            const ref = createRef<Gtk.Scale>();
            const onValueChange = vi.fn();

            await render(
                <GtkScale ref={ref}>
                    <x.Adjustment value={50} lower={0} upper={100} onValueChange={onValueChange} />
                </GtkScale>,
            );

            const adjustment = ref.current?.getAdjustment();
            expect(adjustment).not.toBeNull();

            adjustment?.setValue(75);

            await waitFor(() => {
                expect(onValueChange).toHaveBeenCalledWith(75);
            });
        });

        it("updates onValueChange callback when prop changes", async () => {
            const ref = createRef<Gtk.Scale>();
            const onValueChange1 = vi.fn();
            const onValueChange2 = vi.fn();

            function App({ onValueChange }: { onValueChange: (value: number) => void }) {
                return (
                    <GtkScale ref={ref}>
                        <x.Adjustment value={50} lower={0} upper={100} onValueChange={onValueChange} />
                    </GtkScale>
                );
            }

            await render(<App onValueChange={onValueChange1} />);
            const adjustment = ref.current?.getAdjustment();
            adjustment?.setValue(60);

            await waitFor(() => {
                expect(onValueChange1).toHaveBeenCalledWith(60);
            });

            await render(<App onValueChange={onValueChange2} />);
            adjustment?.setValue(70);

            await waitFor(() => {
                expect(onValueChange2).toHaveBeenCalledWith(70);
            });
        });

        it("removes onValueChange callback when cleared", async () => {
            const ref = createRef<Gtk.Scale>();
            const onValueChange = vi.fn();

            function App({ hasCallback }: { hasCallback: boolean }) {
                return (
                    <GtkScale ref={ref}>
                        <x.Adjustment
                            value={50}
                            lower={0}
                            upper={100}
                            onValueChange={hasCallback ? onValueChange : undefined}
                        />
                    </GtkScale>
                );
            }

            await render(<App hasCallback={true} />);
            const adjustment = ref.current?.getAdjustment();
            adjustment?.setValue(60);

            await waitFor(() => {
                expect(onValueChange).toHaveBeenCalledWith(60);
            });

            const callCount = onValueChange.mock.calls.length;

            await render(<App hasCallback={false} />);
            adjustment?.setValue(70);

            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(onValueChange.mock.calls.length).toBe(callCount);
        });

        it("sets all adjustment properties together", async () => {
            const ref = createRef<Gtk.Scale>();

            await render(
                <GtkScale ref={ref}>
                    <x.Adjustment value={25} lower={10} upper={50} stepIncrement={2} pageIncrement={5} pageSize={0} />
                </GtkScale>,
            );

            const adjustment = ref.current?.getAdjustment();
            expect(adjustment?.getValue()).toBe(25);
            expect(adjustment?.getLower()).toBe(10);
            expect(adjustment?.getUpper()).toBe(50);
            expect(adjustment?.getStepIncrement()).toBe(2);
            expect(adjustment?.getPageIncrement()).toBe(5);
            expect(adjustment?.getPageSize()).toBe(0);
        });
    });
});
