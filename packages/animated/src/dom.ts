import type { GtkCssProperty } from "./gtk-css-properties.js";

declare global {
    interface CSSStyleDeclaration extends Record<GtkCssProperty, string> {}

    interface IntersectionObserverEntry {
        isIntersecting: boolean;
        intersectionRatio: number;
        target: Element;
    }

    interface PointerEvent {
        pageX: number;
        pageY: number;
    }

    type VoidFunction = () => void;

    interface Element {}

    interface HTMLElement {}

    interface SVGElement {}

    var Element: { new (): Element };
    var HTMLElement: { new (): HTMLElement };
    var SVGElement: { new (): SVGElement };
    var window: typeof globalThis;
    var requestAnimationFrame: (callback: (time: number) => void) => number;
    var cancelAnimationFrame: (handle: number) => void;
}
