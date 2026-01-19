import * as Adw from "@gtkx/ffi/adw";
import { AdwAlertDialog, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

const options = { wrapper: false } as const;

describe("render - AlertDialogResponse", () => {
    describe("AlertDialogResponseNode", () => {
        it("creates AlertDialog without responses", async () => {
            const ref = createRef<Adw.AlertDialog>();

            await render(<AdwAlertDialog ref={ref} heading="Test" />, options);

            expect(ref.current).not.toBeNull();
            expect(ref.current?.hasResponse("any")).toBe(false);
        });

        it("creates AlertDialog with responses", async () => {
            const ref = createRef<Adw.AlertDialog>();

            await render(
                <AdwAlertDialog ref={ref} heading="Test">
                    <x.AlertDialogResponse id="cancel" label="Cancel" />
                    <x.AlertDialogResponse id="confirm" label="Confirm" />
                </AdwAlertDialog>,
                options,
            );

            expect(ref.current?.hasResponse("cancel")).toBe(true);
            expect(ref.current?.hasResponse("confirm")).toBe(true);
        });

        it("sets response label", async () => {
            const ref = createRef<Adw.AlertDialog>();

            await render(
                <AdwAlertDialog ref={ref} heading="Test">
                    <x.AlertDialogResponse id="ok" label="OK Button" />
                </AdwAlertDialog>,
                options,
            );

            expect(ref.current?.getResponseLabel("ok")).toBe("OK Button");
        });

        it("sets response appearance", async () => {
            const ref = createRef<Adw.AlertDialog>();

            await render(
                <AdwAlertDialog ref={ref} heading="Test">
                    <x.AlertDialogResponse id="default" label="Default" />
                    <x.AlertDialogResponse
                        id="suggested"
                        label="Suggested"
                        appearance={Adw.ResponseAppearance.SUGGESTED}
                    />
                    <x.AlertDialogResponse
                        id="destructive"
                        label="Delete"
                        appearance={Adw.ResponseAppearance.DESTRUCTIVE}
                    />
                </AdwAlertDialog>,
                options,
            );

            expect(ref.current?.getResponseAppearance("default")).toBe(Adw.ResponseAppearance.DEFAULT);
            expect(ref.current?.getResponseAppearance("suggested")).toBe(Adw.ResponseAppearance.SUGGESTED);
            expect(ref.current?.getResponseAppearance("destructive")).toBe(Adw.ResponseAppearance.DESTRUCTIVE);
        });

        it("sets response enabled state", async () => {
            const ref = createRef<Adw.AlertDialog>();

            await render(
                <AdwAlertDialog ref={ref} heading="Test">
                    <x.AlertDialogResponse id="enabled" label="Enabled" />
                    <x.AlertDialogResponse id="disabled" label="Disabled" enabled={false} />
                </AdwAlertDialog>,
                options,
            );

            expect(ref.current?.getResponseEnabled("enabled")).toBe(true);
            expect(ref.current?.getResponseEnabled("disabled")).toBe(false);
        });

        it("updates response label", async () => {
            const ref = createRef<Adw.AlertDialog>();

            function App({ label }: { label: string }) {
                return (
                    <AdwAlertDialog ref={ref} heading="Test">
                        <x.AlertDialogResponse id="test" label={label} />
                    </AdwAlertDialog>
                );
            }

            await render(<App label="Initial" />, options);
            expect(ref.current?.getResponseLabel("test")).toBe("Initial");

            await render(<App label="Updated" />, options);
            expect(ref.current?.getResponseLabel("test")).toBe("Updated");
        });

        it("updates response appearance", async () => {
            const ref = createRef<Adw.AlertDialog>();

            function App({ appearance }: { appearance: Adw.ResponseAppearance }) {
                return (
                    <AdwAlertDialog ref={ref} heading="Test">
                        <x.AlertDialogResponse id="test" label="Test" appearance={appearance} />
                    </AdwAlertDialog>
                );
            }

            await render(<App appearance={Adw.ResponseAppearance.DEFAULT} />, options);
            expect(ref.current?.getResponseAppearance("test")).toBe(Adw.ResponseAppearance.DEFAULT);

            await render(<App appearance={Adw.ResponseAppearance.DESTRUCTIVE} />, options);
            expect(ref.current?.getResponseAppearance("test")).toBe(Adw.ResponseAppearance.DESTRUCTIVE);
        });

        it("updates response enabled state", async () => {
            const ref = createRef<Adw.AlertDialog>();

            function App({ enabled }: { enabled: boolean }) {
                return (
                    <AdwAlertDialog ref={ref} heading="Test">
                        <x.AlertDialogResponse id="test" label="Test" enabled={enabled} />
                    </AdwAlertDialog>
                );
            }

            await render(<App enabled={true} />, options);
            expect(ref.current?.getResponseEnabled("test")).toBe(true);

            await render(<App enabled={false} />, options);
            expect(ref.current?.getResponseEnabled("test")).toBe(false);
        });

        it("removes responses when unmounted", async () => {
            const ref = createRef<Adw.AlertDialog>();

            function App({ showExtra }: { showExtra: boolean }) {
                return (
                    <AdwAlertDialog ref={ref} heading="Test">
                        <x.AlertDialogResponse id="always" label="Always" />
                        {showExtra && <x.AlertDialogResponse id="extra" label="Extra" />}
                    </AdwAlertDialog>
                );
            }

            await render(<App showExtra={true} />, options);
            expect(ref.current?.hasResponse("always")).toBe(true);
            expect(ref.current?.hasResponse("extra")).toBe(true);

            await render(<App showExtra={false} />, options);
            expect(ref.current?.hasResponse("always")).toBe(true);
            expect(ref.current?.hasResponse("extra")).toBe(false);
        });

        it("handles inserting responses dynamically", async () => {
            const ref = createRef<Adw.AlertDialog>();

            function App({ showMid }: { showMid: boolean }) {
                return (
                    <AdwAlertDialog ref={ref} heading="Test">
                        <x.AlertDialogResponse id="first" label="First" />
                        {showMid && <x.AlertDialogResponse id="middle" label="Middle" />}
                        <x.AlertDialogResponse id="last" label="Last" />
                    </AdwAlertDialog>
                );
            }

            await render(<App showMid={false} />, options);
            expect(ref.current?.hasResponse("first")).toBe(true);
            expect(ref.current?.hasResponse("middle")).toBe(false);
            expect(ref.current?.hasResponse("last")).toBe(true);

            await render(<App showMid={true} />, options);
            expect(ref.current?.hasResponse("first")).toBe(true);
            expect(ref.current?.hasResponse("middle")).toBe(true);
            expect(ref.current?.hasResponse("last")).toBe(true);
        });

        it("handles changing response id", async () => {
            const ref = createRef<Adw.AlertDialog>();

            function App({ id }: { id: string }) {
                return (
                    <AdwAlertDialog ref={ref} heading="Test">
                        <x.AlertDialogResponse id={id} label="Test" appearance={Adw.ResponseAppearance.SUGGESTED} />
                    </AdwAlertDialog>
                );
            }

            await render(<App id="old-id" />, options);
            expect(ref.current?.hasResponse("old-id")).toBe(true);
            expect(ref.current?.getResponseAppearance("old-id")).toBe(Adw.ResponseAppearance.SUGGESTED);

            await render(<App id="new-id" />, options);
            expect(ref.current?.hasResponse("old-id")).toBe(false);
            expect(ref.current?.hasResponse("new-id")).toBe(true);
            expect(ref.current?.getResponseAppearance("new-id")).toBe(Adw.ResponseAppearance.SUGGESTED);
        });
    });
});
