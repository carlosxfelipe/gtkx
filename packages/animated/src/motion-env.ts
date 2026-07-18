export interface SyntheticEvent {
    type: string;
    target?: unknown;
    currentTarget?: unknown;
    [key: string]: unknown;
}

export type SyntheticEventListener = (event: SyntheticEvent) => void;

export interface SyntheticEventListenerOptions {
    signal?: AbortSignal;
    capture?: boolean;
    passive?: boolean;
    once?: boolean;
}

export class SyntheticEventTarget {
    private listeners: Map<string, Set<SyntheticEventListener>> = new Map();

    addEventListener(type: string, listener: SyntheticEventListener, options?: SyntheticEventListenerOptions): void {
        if (options?.signal?.aborted) return;
        let set = this.listeners.get(type);
        if (!set) {
            set = new Set();
            this.listeners.set(type, set);
        }
        set.add(listener);
        options?.signal?.addEventListener("abort", () => this.removeEventListener(type, listener), { once: true });
    }

    removeEventListener(type: string, listener: SyntheticEventListener): void {
        this.listeners.get(type)?.delete(listener);
    }

    dispatchEvent(event: SyntheticEvent): boolean {
        if (event.target === undefined) event.target = this;
        const set = this.listeners.get(event.type);
        if (!set) return true;
        for (const listener of [...set]) {
            event.currentTarget = this;
            listener(event);
        }
        return true;
    }

    listenerCount(type: string): number {
        return this.listeners.get(type)?.size ?? 0;
    }
}

export interface MotionMediaQueryList {
    matches: boolean;
    addEventListener(type: string, listener: SyntheticEventListener): void;
    removeEventListener(type: string, listener: SyntheticEventListener): void;
}

export interface MotionWindow extends SyntheticEventTarget {
    matchMedia(query: string): MotionMediaQueryList;
    innerWidth: number;
    innerHeight: number;
    scrollX: number;
    scrollY: number;
}

let reducedMotionMatches = false;
let matchMediaInitialized = false;
const matchMediaInitHooks: Array<() => void> = [];
const mediaQueryListeners: Set<SyntheticEventListener> = new Set();

export const onMatchMediaInit = (hook: () => void): void => {
    if (matchMediaInitialized) {
        hook();
        return;
    }
    matchMediaInitHooks.push(hook);
};

export const setReducedMotionMatches = (matches: boolean): void => {
    if (reducedMotionMatches === matches) return;
    reducedMotionMatches = matches;
    for (const listener of [...mediaQueryListeners]) {
        listener({ type: "change", matches });
    }
};

class MotionWindowImpl extends SyntheticEventTarget implements MotionWindow {
    innerWidth = 0;
    innerHeight = 0;
    scrollX = 0;
    scrollY = 0;

    matchMedia(_query: string): MotionMediaQueryList {
        if (!matchMediaInitialized) {
            matchMediaInitialized = true;
            for (const hook of matchMediaInitHooks.splice(0)) hook();
        }
        return {
            get matches(): boolean {
                return reducedMotionMatches;
            },
            addEventListener(type: string, listener: SyntheticEventListener): void {
                if (type === "change") mediaQueryListeners.add(listener);
            },
            removeEventListener(_type: string, listener: SyntheticEventListener): void {
                mediaQueryListeners.delete(listener);
            },
        };
    }
}

let nextFrameHandle = 1;
const frameTimers: Map<number, NodeJS.Timeout> = new Map();

const requestFrame = (callback: (time: number) => void): number => {
    const handle = nextFrameHandle;
    nextFrameHandle += 1;
    const timer = setTimeout(() => {
        frameTimers.delete(handle);
        callback(performance.now());
    }, 16);
    frameTimers.set(handle, timer);
    return handle;
};

const cancelFrame = (handle: number): void => {
    const timer = frameTimers.get(handle);
    if (timer === undefined) return;
    clearTimeout(timer);
    frameTimers.delete(handle);
};

class ElementStub {}
class HTMLElementStub extends ElementStub {}
class HTMLButtonElementStub extends HTMLElementStub {}

class PointerEventStub {
    type: string;

    constructor(type: string, init?: Record<string, unknown>) {
        this.type = type;
        if (init) Object.assign(this, init);
    }
}

if (globalThis.requestAnimationFrame === undefined) {
    globalThis.requestAnimationFrame = requestFrame;
}

if (globalThis.cancelAnimationFrame === undefined) {
    globalThis.cancelAnimationFrame = cancelFrame;
}

if (globalThis.window === undefined) {
    globalThis.window = new MotionWindowImpl();
}

if (globalThis.document === undefined) {
    globalThis.document = {};
}

if (globalThis.Element === undefined) {
    globalThis.Element = ElementStub;
}

if (globalThis.HTMLElement === undefined) {
    globalThis.HTMLElement = HTMLElementStub;
}

if (globalThis.HTMLButtonElement === undefined) {
    globalThis.HTMLButtonElement = HTMLButtonElementStub;
}

if (globalThis.PointerEvent === undefined) {
    globalThis.PointerEvent = PointerEventStub;
}

if (globalThis.getComputedStyle === undefined) {
    globalThis.getComputedStyle = () => ({});
}

export const motionWindow: MotionWindow = globalThis.window;

export interface WindowMetrics {
    innerWidth?: number;
    innerHeight?: number;
}

export const setWindowMetrics = (metrics: WindowMetrics): void => {
    if (metrics.innerWidth !== undefined) motionWindow.innerWidth = metrics.innerWidth;
    if (metrics.innerHeight !== undefined) motionWindow.innerHeight = metrics.innerHeight;
};
