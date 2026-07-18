import type { MotionWindow } from "./motion-env.js";

declare global {
    var window: MotionWindow;
    var document: object;
    var requestAnimationFrame: (callback: (time: number) => void) => number;
    var cancelAnimationFrame: (handle: number) => void;
    var Element: new () => object;
    var HTMLElement: new () => object;
    var HTMLButtonElement: new () => object;
    var PointerEvent: new (type: string, init?: Record<string, unknown>) => object;
    var getComputedStyle: (element: unknown) => Record<string, string>;
}
