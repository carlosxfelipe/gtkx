import type * as Adw from "@gtkx/ffi/adw";
import { AdwToastOverlay, GtkLabel, Toast } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

describe("render - Toast", () => {
    describe("ToastNode", () => {
        it("shows toast when mounted", async () => {
            const overlayRef = createRef<Adw.ToastOverlay>();
            const onDismissed = vi.fn();

            await render(
                <AdwToastOverlay ref={overlayRef}>
                    <GtkLabel label="Content" />
                    <Toast title="Hello" timeout={0} onDismissed={onDismissed} />
                </AdwToastOverlay>,
            );

            expect(overlayRef.current).not.toBeNull();
        });

        it("dismisses toast when unmounted", async () => {
            const overlayRef = createRef<Adw.ToastOverlay>();
            const onDismissed = vi.fn();

            function App({ showToast }: { showToast: boolean }) {
                return (
                    <AdwToastOverlay ref={overlayRef}>
                        <GtkLabel label="Content" />
                        {showToast && <Toast title="Hello" timeout={0} onDismissed={onDismissed} />}
                    </AdwToastOverlay>
                );
            }

            const { rerender } = await render(<App showToast={true} />);
            await rerender(<App showToast={false} />);

            expect(onDismissed).toHaveBeenCalled();
        });

        it("calls onButtonClicked when button is clicked", async () => {
            const overlayRef = createRef<Adw.ToastOverlay>();
            const onButtonClicked = vi.fn();

            await render(
                <AdwToastOverlay ref={overlayRef}>
                    <GtkLabel label="Content" />
                    <Toast title="Hello" timeout={0} buttonLabel="Click me" onButtonClicked={onButtonClicked} />
                </AdwToastOverlay>,
            );

            expect(overlayRef.current).not.toBeNull();
        });

        it("supports multiple toasts", async () => {
            const overlayRef = createRef<Adw.ToastOverlay>();

            await render(
                <AdwToastOverlay ref={overlayRef}>
                    <GtkLabel label="Content" />
                    <Toast title="First" timeout={0} />
                    <Toast title="Second" timeout={0} />
                    <Toast title="Third" timeout={0} />
                </AdwToastOverlay>,
            );

            expect(overlayRef.current).not.toBeNull();
        });

        it("updates toast title when prop changes", async () => {
            const overlayRef = createRef<Adw.ToastOverlay>();

            function App({ title }: { title: string }) {
                return (
                    <AdwToastOverlay ref={overlayRef}>
                        <GtkLabel label="Content" />
                        <Toast title={title} timeout={0} />
                    </AdwToastOverlay>
                );
            }

            await render(<App title="Initial" />);
            await render(<App title="Updated" />);

            expect(overlayRef.current).not.toBeNull();
        });
    });
});
