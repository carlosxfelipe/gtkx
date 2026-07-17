import { animated } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkScrolledWindow } from "@gtkx/jsx/gtk";
import { render as baseRender, screen, userEvent, waitFor } from "@gtkx/testing";
import { createRef, type ReactNode } from "react";
import { describe, expect, it, type Mock, vi } from "vitest";

const render = (element: ReactNode) => baseRender(element, { animations: true });

const VIEWPORT_HEIGHT = 200;
const SPACER_HEIGHT = 600;
const SETTLE_MS = 150;

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

interface InViewFixture {
    enterSpy: Mock;
    leaveSpy: Mock;
    target: Gtk.Widget;
}

const renderInViewFixture = async (viewport?: { once?: boolean }): Promise<InViewFixture> => {
    const enterSpy = vi.fn();
    const leaveSpy = vi.fn();

    await render(
        <GtkBox orientation={Gtk.Orientation.VERTICAL}>
            <GtkScrolledWindow heightRequest={VIEWPORT_HEIGHT} hexpand={false} vexpand={false}>
                <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                    <GtkBox heightRequest={SPACER_HEIGHT} />
                    <animated.GtkLabel
                        label="Target"
                        initial={{ opacity: 0.2 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.05 }}
                        onViewportEnter={enterSpy}
                        onViewportLeave={leaveSpy}
                        {...(viewport ? { viewport } : {})}
                    />
                </GtkBox>
            </GtkScrolledWindow>
        </GtkBox>,
    );

    const target = await screen.findByText("Target");
    return { enterSpy, leaveSpy, target };
};

describe("animated inView (1)", () => {
    it("enters when scrolled into view and leaves when scrolled away", async () => {
        const { enterSpy, leaveSpy, target } = await renderInViewFixture();

        await settle();
        expect(enterSpy).not.toHaveBeenCalled();
        expect(leaveSpy).not.toHaveBeenCalled();

        await userEvent.scroll(target, { y: SPACER_HEIGHT });
        await waitFor(() => expect(enterSpy).toHaveBeenCalledTimes(1));
        expect(leaveSpy).not.toHaveBeenCalled();
        expect(enterSpy.mock.calls[0]?.[0]?.isIntersecting).toBe(true);

        await userEvent.scroll(target, { y: -SPACER_HEIGHT });
        await waitFor(() => expect(leaveSpy).toHaveBeenCalledTimes(1));
        expect(enterSpy).toHaveBeenCalledTimes(1);
        expect(leaveSpy.mock.calls[0]?.[0]?.isIntersecting).toBe(false);
    });
});

describe("animated inView (2)", () => {
    it("never reports leave after entering when once is set", async () => {
        const { enterSpy, leaveSpy, target } = await renderInViewFixture({ once: true });

        await userEvent.scroll(target, { y: SPACER_HEIGHT });
        await waitFor(() => expect(enterSpy).toHaveBeenCalledTimes(1));

        await userEvent.scroll(target, { y: -SPACER_HEIGHT });
        await settle();
        expect(leaveSpy).not.toHaveBeenCalled();
        expect(enterSpy).toHaveBeenCalledTimes(1);
    });
});

describe("animated inView (3)", () => {
    it("enters when content shrinkage moves the target into view without scrolling", async () => {
        const enterSpy = vi.fn();

        function Fixture({ spacerHeight }: { spacerHeight: number }) {
            return (
                <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                    <GtkScrolledWindow heightRequest={VIEWPORT_HEIGHT} hexpand={false} vexpand={false}>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                            <GtkBox heightRequest={spacerHeight} />
                            <animated.GtkLabel
                                label="Shrink Target"
                                initial={{ opacity: 0.2 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ duration: 0.05 }}
                                onViewportEnter={enterSpy}
                            />
                        </GtkBox>
                    </GtkScrolledWindow>
                </GtkBox>
            );
        }

        const { rerender } = await render(<Fixture spacerHeight={SPACER_HEIGHT} />);
        await screen.findByText("Shrink Target");
        await settle();
        expect(enterSpy).not.toHaveBeenCalled();

        await rerender(<Fixture spacerHeight={0} />);
        await waitFor(() => expect(enterSpy).toHaveBeenCalled());
    });
});

describe("animated inView (4)", () => {
    it("re-evaluates against a non-scrollable root when the window relayouts", async () => {
        const enterSpy = vi.fn();
        const rootRef = createRef<Gtk.Box>();
        const tallSpacerHeight = 1200;

        await render(
            <GtkBox orientation={Gtk.Orientation.VERTICAL} ref={rootRef}>
                <GtkScrolledWindow heightRequest={VIEWPORT_HEIGHT} hexpand={false} vexpand={false}>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                        <GtkBox heightRequest={tallSpacerHeight} />
                        <animated.GtkLabel
                            label="Rooted Target"
                            initial={{ opacity: 0.2 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ duration: 0.05 }}
                            onViewportEnter={enterSpy}
                            viewport={{ root: rootRef }}
                        />
                    </GtkBox>
                </GtkScrolledWindow>
            </GtkBox>,
        );

        const target = await screen.findByText("Rooted Target");
        await settle();
        expect(enterSpy).not.toHaveBeenCalled();

        await userEvent.scroll(target, { y: tallSpacerHeight });
        await waitFor(() => expect(enterSpy).toHaveBeenCalled());
    });
});
