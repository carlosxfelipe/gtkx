import type * as Gtk from "@gtkx/gi/gtk";

const CLOCK_STALL_FALLBACK_MS = 500;

export type LayoutSettled = (widget: Gtk.Widget, tick: number) => boolean;

export type FrameSyncOptions = {
    settled?: LayoutSettled;
    stallFallbackMs?: number;
};

const settledAfterTwoTicks: LayoutSettled = (_widget, tick) => tick >= 2;

export const scheduleAfterLayout = (
    widget: Gtk.Widget | null,
    callback: () => void,
    options: FrameSyncOptions = {},
): void => {
    const settled = options.settled ?? settledAfterTwoTicks;
    const stallFallbackMs = options.stallFallbackMs ?? CLOCK_STALL_FALLBACK_MS;

    let done = false;
    let removeTick: (() => void) | null = null;
    let fallback: ReturnType<typeof setTimeout> | null = null;
    const finish = (): void => {
        if (done) return;
        done = true;
        if (fallback !== null) clearTimeout(fallback);
        removeTick?.();
        removeTick = null;
        fallback = null;
        callback();
    };

    if (widget === null || widget.getFrameClock() === null || settled(widget, 0)) {
        queueMicrotask(finish);
        return;
    }

    fallback = setTimeout(finish, stallFallbackMs);
    let tick = 0;
    const tickId = widget.addTickCallback(() => {
        tick += 1;
        if (!settled(widget, tick)) return true;
        finish();
        return false;
    });
    removeTick = () => widget.removeTickCallback(tickId);
};
