import type * as Gtk from "@gtkx/gi/gtk";

const NO_CLOCK_FALLBACK_MS = 64;
const CLOCK_STALL_FALLBACK_MS = 500;

export const scheduleAfterGtkLayout = (widget: Gtk.Widget | null, callback: () => void): void => {
    let done = false;
    let cleanupTick: (() => void) | null = null;
    const run = (): void => {
        if (done) return;
        done = true;
        cleanupTick?.();
        callback();
    };
    const realized = widget !== null && widget.getFrameClock() !== null;
    const fallback = setTimeout(run, realized ? CLOCK_STALL_FALLBACK_MS : NO_CLOCK_FALLBACK_MS);
    if (realized && widget) {
        let ticks = 0;
        const tickId = widget.addTickCallback(() => {
            ticks += 1;
            if (ticks < 2) return true;
            clearTimeout(fallback);
            cleanupTick = null;
            run();
            return false;
        });
        cleanupTick = () => widget.removeTickCallback(tickId);
    }
};
