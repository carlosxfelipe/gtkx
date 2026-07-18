import type * as Gtk from "@gtkx/gi/gtk";
import { ScrolledWindow } from "@gtkx/gi/gtk";
import { scheduleAfterLayout } from "@gtkx/react/internal";
import { Feature } from "motion/react";

type ViewportOptions = {
    root?: { current: Gtk.Widget | null } | undefined;
    once?: boolean | undefined;
    amount?: "some" | "all" | number | undefined;
    margin?: string | undefined;
};

const findViewport = (widget: Gtk.Widget, options: ViewportOptions): Gtk.Widget | null => {
    if (options.root?.current) return options.root.current;
    let current = widget.getParent();
    while (current) {
        if (current instanceof ScrolledWindow) return current;
        current = current.getParent();
    }
    return (widget.getRoot() as unknown as Gtk.Widget | null) ?? null;
};

const parseMargin = (margin: string | undefined): [number, number, number, number] => {
    const parts = (margin ?? "").split(" ").flatMap((part) => {
        const parsed = Number.parseFloat(part);
        return Number.isNaN(parsed) ? [] : [parsed];
    });
    const [top = 0, right = top, bottom = top, left = right] = parts;
    return [top, right, bottom, left];
};

const intersectionRatio = (widget: Gtk.Widget, viewport: Gtk.Widget, margin: string | undefined): number => {
    const [contained, rect] = widget.computeBounds(viewport);
    if (!contained) return 0;
    const width = rect.getWidth();
    const height = rect.getHeight();
    if (width <= 0 || height <= 0) return 0;
    const [marginTop, marginRight, marginBottom, marginLeft] = parseMargin(margin);
    const left = Math.max(rect.getX(), -marginLeft);
    const top = Math.max(rect.getY(), -marginTop);
    const right = Math.min(rect.getX() + width, viewport.getWidth() + marginRight);
    const bottom = Math.min(rect.getY() + height, viewport.getHeight() + marginBottom);
    const visibleWidth = Math.max(right - left, 0);
    const visibleHeight = Math.max(bottom - top, 0);
    return (visibleWidth * visibleHeight) / (width * height);
};

const meetsAmount = (ratio: number, amount: ViewportOptions["amount"]): boolean => {
    if (amount === "all") return ratio >= 1;
    if (typeof amount === "number") return ratio >= amount;
    return ratio > 0;
};

export class InViewFeature extends Feature<Gtk.Widget> {
    private isInView = false;
    private cleanups: VoidFunction[] = [];
    private observing = false;
    private checkScheduled = false;

    private get viewportOptions(): ViewportOptions {
        return (this.node.getProps().viewport ?? {}) as ViewportOptions;
    }

    private check = (): void => {
        const widget = this.node.current;
        if (!this.observing || !widget) return;
        const options = this.viewportOptions;
        const viewport = findViewport(widget, options);
        const ratio = widget.getMapped() && viewport ? intersectionRatio(widget, viewport, options.margin) : 0;
        const isInView = meetsAmount(ratio, options.amount);
        if (isInView === this.isInView) return;
        this.isInView = isInView;
        this.node.animationState?.setActive("whileInView", isInView);
        const props = this.node.getProps();
        const handler = isInView ? props.onViewportEnter : props.onViewportLeave;
        const entry = {
            isIntersecting: isInView,
            intersectionRatio: ratio,
            target: widget,
        } as unknown as IntersectionObserverEntry;
        handler?.(entry);
        if (isInView && options.once) this.stopObserving();
    };

    private scheduleCheck = (): void => {
        if (this.checkScheduled || !this.observing) return;
        this.checkScheduled = true;
        scheduleAfterLayout(this.node.current, () => {
            this.checkScheduled = false;
            this.check();
        });
    };

    private observeAdjustment(adjustment: Gtk.Adjustment): void {
        const valueId = adjustment.connect("value-changed", this.scheduleCheck);
        const changedId = adjustment.connect("changed", this.scheduleCheck);
        this.cleanups.push(() => {
            adjustment.disconnect(valueId);
            adjustment.disconnect(changedId);
        });
    }

    mount(): void {
        const widget = this.node.current;
        if (!widget) return;
        this.observing = true;
        const mapId = widget.connect("map", this.scheduleCheck);
        const unmapId = widget.connect("unmap", this.scheduleCheck);
        this.cleanups.push(() => {
            widget.disconnect(mapId);
            widget.disconnect(unmapId);
        });
        let ancestor = widget.getParent();
        while (ancestor) {
            if (ancestor instanceof ScrolledWindow) {
                this.observeAdjustment(ancestor.getHadjustment());
                this.observeAdjustment(ancestor.getVadjustment());
            }
            ancestor = ancestor.getParent();
        }
        this.scheduleCheck();
    }

    private stopObserving(): void {
        this.observing = false;
        for (const cleanup of this.cleanups) cleanup();
        this.cleanups = [];
    }

    unmount(): void {
        this.stopObserving();
    }
}
