import type * as Gdk from "@gtkx/gi/gdk";
import type * as Gtk from "@gtkx/gi/gtk";
import { Window as GtkWindow } from "@gtkx/gi/gtk";
import "./dom.js";

const FALLBACK_INTERVAL_MS = 1000 / 60;
const CLOCK_STALL_FALLBACK_MS = 250;

type FrameCallback = (time: number) => void;
type Timer = ReturnType<typeof setTimeout>;

const unreffedTimeout = (callback: () => void, delay: number): Timer => {
    const timer = setTimeout(callback, delay);
    if (typeof timer === "object") timer.unref();
    return timer;
};

class FrameDriver {
    private callbacks = new Map<number, FrameCallback>();
    private nextHandle = 1;
    private tickWindow: Gtk.Window | null = null;
    private tickId = 0;
    private fallbackTimer: Timer | null = null;
    private stallTimer: Timer | null = null;

    request(callback: FrameCallback): number {
        const handle = this.nextHandle;
        this.nextHandle += 1;
        this.callbacks.set(handle, callback);
        this.schedule();
        return handle;
    }

    cancel(handle: number): void {
        this.callbacks.delete(handle);
    }

    private schedule(): void {
        if (this.tickWindow) return;
        const window = this.findRealizedToplevel();
        if (window) {
            this.tickWindow = window;
            this.tickId = window.addTickCallback((_widget, clock) => this.onTick(clock));
            this.armStallTimer();
            return;
        }
        if (this.fallbackTimer === null) {
            this.fallbackTimer = unreffedTimeout(() => {
                this.fallbackTimer = null;
                this.flush(performance.now());
                if (this.callbacks.size > 0) this.schedule();
            }, FALLBACK_INTERVAL_MS);
        }
    }

    private findRealizedToplevel(): Gtk.Window | null {
        const toplevels = GtkWindow.getToplevels();
        for (let index = 0; index < toplevels.getNItems(); index += 1) {
            const toplevel = toplevels.getItem(index);
            if (toplevel instanceof GtkWindow && toplevel.getFrameClock()) return toplevel;
        }
        return null;
    }

    private onTick(clock: Gdk.FrameClock): boolean {
        this.flush(Number(clock.getFrameTime()) / 1000);
        if (this.callbacks.size > 0) {
            this.armStallTimer();
            return true;
        }
        this.detachTick(false);
        return false;
    }

    private detachTick(removeCallback: boolean): void {
        if (this.stallTimer !== null) {
            clearTimeout(this.stallTimer);
            this.stallTimer = null;
        }
        const window = this.tickWindow;
        this.tickWindow = null;
        if (removeCallback && window) window.removeTickCallback(this.tickId);
        this.tickId = 0;
    }

    private armStallTimer(): void {
        if (this.stallTimer !== null) clearTimeout(this.stallTimer);
        this.stallTimer = unreffedTimeout(() => {
            this.stallTimer = null;
            this.detachTick(true);
            this.flush(performance.now());
            if (this.callbacks.size > 0) this.schedule();
        }, CLOCK_STALL_FALLBACK_MS);
    }

    private flush(time: number): void {
        const batch = [...this.callbacks.values()];
        this.callbacks.clear();
        for (const callback of batch) callback(time);
    }
}

const installFrameDriver = (): void => {
    if (typeof globalThis.requestAnimationFrame === "function") return;
    const driver = new FrameDriver();
    globalThis.requestAnimationFrame = (callback: FrameCallback): number => driver.request(callback);
    globalThis.cancelAnimationFrame = (handle: number): void => driver.cancel(handle);
};

const installDomStubs = (): void => {
    globalThis.Element ??= class {};
    globalThis.HTMLElement ??= class {};
    globalThis.SVGElement ??= class {};
    globalThis.window ??= globalThis;
};

installFrameDriver();
installDomStubs();
