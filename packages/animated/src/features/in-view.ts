import "../motion-env.js";
import type * as Gdk from "@gtkx/gi/gdk";
import * as Graphene from "@gtkx/gi/graphene";
import * as Gtk from "@gtkx/gi/gtk";
import { Feature, type MotionNodeOptions, type VisualElement } from "motion-dom";
import { rootWidgetOf } from "../bridge/geometry.js";
import { WidgetProxy } from "../bridge/widget-proxy.js";

export interface GtkViewportEntry {
    isIntersecting: boolean;
    intersectionRatio: number;
    target: Gtk.Widget;
}

export interface ViewportMarginBox {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

type ViewportOptions = NonNullable<MotionNodeOptions["viewport"]>;

type ViewportAmount = ViewportOptions["amount"];

const parseMarginToken = (token: string): number => {
    const match = /^(-?\d*\.?\d+)px$/.exec(token);
    const value = match?.[1];
    return value === undefined ? 0 : Number(value);
};

export const parseViewportMargin = (margin: string | undefined): ViewportMarginBox => {
    const values = (margin ?? "")
        .split(/\s+/)
        .filter((token) => token.length > 0)
        .map(parseMarginToken);
    const top = values[0] ?? 0;
    const right = values[1] ?? top;
    const bottom = values[2] ?? top;
    const left = values[3] ?? right;
    return { top, right, bottom, left };
};

export const reachesViewportAmount = (amount: ViewportAmount, ratio: number, overlapArea: number): boolean => {
    if (amount === "all") return ratio >= 0.999;
    if (typeof amount === "number") return ratio >= amount;
    return overlapArea > 0;
};

interface IntersectionMeasurement {
    isIntersecting: boolean;
    ratio: number;
}

const notIntersecting = (): IntersectionMeasurement => ({ isIntersecting: false, ratio: 0 });

const viewportRectOf = (viewport: Gtk.Widget, margin: ViewportMarginBox): Graphene.Rect =>
    new Graphene.Rect().init(
        -margin.left,
        -margin.top,
        viewport.getWidth() + margin.left + margin.right,
        viewport.getHeight() + margin.top + margin.bottom,
    );

const measureIntersection = (
    widget: Gtk.Widget,
    viewport: Gtk.Widget,
    options: ViewportOptions,
): IntersectionMeasurement => {
    if (!widget.getMapped()) return notIntersecting();
    const [hasBounds, widgetRect] = widget.computeBounds(viewport);
    if (!hasBounds) return notIntersecting();
    const viewportRect = viewportRectOf(viewport, parseViewportMargin(options.margin));
    const [overlaps, overlap] = viewportRect.intersection(widgetRect);
    const overlapArea = overlaps ? overlap.getArea() : 0;
    const widgetArea = widgetRect.getArea();
    const ratio = widgetArea === 0 ? 0 : overlapArea / widgetArea;
    return { isIntersecting: reachesViewportAmount(options.amount, ratio, overlapArea), ratio };
};

const rootWidgetFromRef = (root: ViewportOptions["root"]): Gtk.Widget | null => {
    const current = root?.current;
    if (current instanceof WidgetProxy) return current.widget;
    if (current instanceof Gtk.Widget) return current;
    return null;
};

const nearestScrolledWindow = (widget: Gtk.Widget): Gtk.ScrolledWindow | null => {
    for (let parent = widget.getParent(); parent; parent = parent.getParent()) {
        if (parent instanceof Gtk.ScrolledWindow) return parent;
    }
    return null;
};

const resolveViewportWidget = (widget: Gtk.Widget, options: ViewportOptions): Gtk.Widget =>
    rootWidgetFromRef(options.root) ?? nearestScrolledWindow(widget) ?? rootWidgetOf(widget);

const scrollAdjustmentsOf = (viewport: Gtk.Widget): Gtk.Adjustment[] =>
    viewport instanceof Gtk.ScrolledWindow ? [viewport.getHadjustment(), viewport.getVadjustment()] : [];

const VIEWPORT_OPTION_NAMES: ("amount" | "margin" | "root")[] = ["amount", "margin", "root"];

const EVALUATION_FRAME_CHAIN = 2;

export class GtkInViewFeature extends Feature<unknown> {
    private isInView = false;
    private hasEnteredView = false;
    private viewportWidget: Gtk.Widget | null = null;
    private observedWidget: Gtk.Widget | null = null;
    private adjustments: Gtk.Adjustment[] = [];
    private layoutSurface: Gdk.Surface | null = null;
    private pendingFrame: number | null = null;
    private pendingEvaluations = 0;

    constructor(node: unknown) {
        super(node as VisualElement<unknown>);
    }

    private currentProxy(): WidgetProxy | null {
        const current = this.node.current;
        return current instanceof WidgetProxy ? current : null;
    }

    private viewportOptions(): ViewportOptions {
        return this.node.getProps().viewport ?? {};
    }

    private isDormant(): boolean {
        return this.hasEnteredView && this.viewportOptions().once === true;
    }

    private onGeometryChanged = (): void => {
        this.evaluate();
        this.scheduleEvaluate();
    };

    private scheduleEvaluate(): void {
        if (this.isDormant()) return;
        this.pendingEvaluations = EVALUATION_FRAME_CHAIN;
        if (this.pendingFrame !== null) return;
        this.pendingFrame = requestAnimationFrame(this.onFrame);
    }

    private onFrame = (): void => {
        this.pendingFrame = null;
        this.pendingEvaluations -= 1;
        this.evaluate();
        if (this.pendingEvaluations > 0) {
            this.pendingFrame = requestAnimationFrame(this.onFrame);
        }
    };

    private connectScroll(viewport: Gtk.Widget): void {
        this.disconnectScroll();
        this.viewportWidget = viewport;
        this.adjustments = scrollAdjustmentsOf(viewport);
        for (const adjustment of this.adjustments) {
            adjustment.on("value-changed", this.onGeometryChanged);
            adjustment.on("changed", this.onGeometryChanged);
        }
        if (this.adjustments.length === 0) this.connectSurfaceLayout(viewport);
    }

    private connectSurfaceLayout(viewport: Gtk.Widget): void {
        const surface = viewport.getNative()?.getSurface() ?? null;
        if (!surface) return;
        this.layoutSurface = surface;
        surface.on("layout", this.onGeometryChanged);
    }

    private disconnectScroll(): void {
        for (const adjustment of this.adjustments) {
            adjustment.off("value-changed", this.onGeometryChanged);
            adjustment.off("changed", this.onGeometryChanged);
        }
        this.adjustments = [];
        if (this.layoutSurface) {
            this.layoutSurface.off("layout", this.onGeometryChanged);
            this.layoutSurface = null;
        }
        this.viewportWidget = null;
    }

    private hasGeometrySubscription(): boolean {
        return this.adjustments.length > 0 || this.layoutSurface !== null;
    }

    private syncViewport(widget: Gtk.Widget): Gtk.Widget {
        const viewport = resolveViewportWidget(widget, this.viewportOptions());
        if (viewport !== this.viewportWidget || !this.hasGeometrySubscription()) this.connectScroll(viewport);
        return viewport;
    }

    private evaluate = (): void => {
        const proxy = this.currentProxy();
        if (!proxy || this.isDormant()) return;
        const viewport = this.syncViewport(proxy.widget);
        const { isIntersecting, ratio } = measureIntersection(proxy.widget, viewport, this.viewportOptions());
        this.applyChange(isIntersecting, ratio, proxy.widget);
    };

    private applyChange(isIntersecting: boolean, ratio: number, widget: Gtk.Widget): void {
        if (this.isInView === isIntersecting) return;
        this.isInView = isIntersecting;
        const once = this.viewportOptions().once === true;
        if (isIntersecting) {
            this.hasEnteredView = true;
            if (once) this.disconnectScroll();
        }
        this.node.animationState?.setActive("whileInView", isIntersecting);
        const props = this.node.getProps();
        const callback = isIntersecting ? props.onViewportEnter : props.onViewportLeave;
        if (!callback) return;
        const entry: GtkViewportEntry = { isIntersecting, intersectionRatio: ratio, target: widget };
        callback(entry);
    }

    private hasViewportOptionsChanged(): boolean {
        const viewport = this.node.props.viewport ?? {};
        const prevViewport = this.node.prevProps?.viewport ?? {};
        return VIEWPORT_OPTION_NAMES.some((name) => viewport[name] !== prevViewport[name]);
    }

    mount(): void {
        const proxy = this.currentProxy();
        if (!proxy) return;
        this.observedWidget = proxy.widget;
        proxy.widget.on("map", this.onGeometryChanged);
        proxy.widget.on("unmap", this.onGeometryChanged);
        this.syncViewport(proxy.widget);
        this.scheduleEvaluate();
    }

    override update(): void {
        if (this.hasViewportOptionsChanged()) this.disconnectScroll();
        this.evaluate();
    }

    unmount(): void {
        this.disconnectScroll();
        const widget = this.observedWidget;
        if (widget) {
            widget.off("map", this.onGeometryChanged);
            widget.off("unmap", this.onGeometryChanged);
        }
        this.observedWidget = null;
        if (this.pendingFrame !== null) {
            cancelAnimationFrame(this.pendingFrame);
            this.pendingFrame = null;
        }
        this.pendingEvaluations = 0;
        this.isInView = false;
        this.hasEnteredView = false;
    }
}
