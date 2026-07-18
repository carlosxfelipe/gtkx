import { EventType } from "@gtkx/gi/gdk";
import type * as Gtk from "@gtkx/gi/gtk";
import {
    EventControllerLegacy,
    EventControllerMotion,
    EventSequenceState,
    GestureDrag,
    PropagationPhase,
} from "@gtkx/gi/gtk";
import type { DragControls, MotionProps, MotionValue, PanInfo, VisualElement } from "motion/react";
import { animateMotionValue, mixNumber, setDragLock } from "motion/react";
import type { SyntheticPointerEvent } from "./gestures.js";
import { ControllerFeature, pointerEventAtPoint, pointerEventFor } from "./gestures.js";
import { measureWidgetBounds } from "./visual-element.js";

type DragAxis = "x" | "y";
type AxisConstraints = { min?: number | undefined; max?: number | undefined };
type AxisElastic = { min: number; max: number };
type Point = { x: number; y: number };

const DRAG_AXES: DragAxis[] = ["x", "y"];
const START_THRESHOLD = 3;
const DIRECTION_LOCK_THRESHOLD = 10;
const DEFAULT_ELASTIC = 0.35;

type GtkVisualElement = VisualElement<Gtk.Widget>;

const shouldDrag = (axis: DragAxis, drag: MotionProps["drag"], currentDirection: DragAxis | null): boolean =>
    (drag === true || drag === axis) && (currentDirection === null || currentDirection === axis);

const getCurrentDirection = (offset: Point): DragAxis | null => {
    if (Math.abs(offset.y) > DIRECTION_LOCK_THRESHOLD) return "y";
    if (Math.abs(offset.x) > DIRECTION_LOCK_THRESHOLD) return "x";
    return null;
};

const resolveElastic = (dragElastic: MotionProps["dragElastic"]): { x: AxisElastic; y: AxisElastic } => {
    const resolveSide = (side: "top" | "left" | "right" | "bottom"): number => {
        if (dragElastic === false) return 0;
        if (dragElastic === true || dragElastic === undefined) return DEFAULT_ELASTIC;
        if (typeof dragElastic === "number") return dragElastic;
        return dragElastic[side] ?? 0;
    };
    return {
        x: { min: resolveSide("left"), max: resolveSide("right") },
        y: { min: resolveSide("top"), max: resolveSide("bottom") },
    };
};

const applyConstraints = (point: number, constraints: AxisConstraints, elastic: AxisElastic): number => {
    const { min, max } = constraints;
    if (min !== undefined && point < min) {
        return elastic.min > 0 ? mixNumber(min, point, elastic.min) : Math.max(point, min);
    }
    if (max !== undefined && point > max) {
        return elastic.max > 0 ? mixNumber(max, point, elastic.max) : Math.min(point, max);
    }
    return point;
};

const panInfoFor = (point: Point, delta: Point, offset: Point, velocity: Point): PanInfo => ({
    point,
    delta,
    offset,
    velocity,
});

const deltaFrom = (offset: Point, lastOffset: Point): Point => ({
    x: offset.x - lastOffset.x,
    y: offset.y - lastOffset.y,
});

export class GtkDragSession {
    private node: GtkVisualElement;
    private isDragging = false;
    private originValues: Point = { x: 0, y: 0 };
    private startPoint: Point = { x: 0, y: 0 };
    private lastOffset: Point = { x: 0, y: 0 };
    private currentDirection: DragAxis | null = null;
    private constraints: { x: AxisConstraints; y: AxisConstraints } = { x: {}, y: {} };
    private releaseDragLock: VoidFunction | null = null;
    private claim: (() => void) | null = null;

    constructor(node: GtkVisualElement) {
        this.node = node;
    }

    private get props(): MotionProps {
        return this.node.getProps();
    }

    private axisValue(axis: DragAxis): MotionValue<number> {
        const external = axis === "x" ? this.props._dragX : this.props._dragY;
        if (external) return external;
        const value = this.node.getValue(axis, 0);
        if (!value) throw new Error(`Missing motion value for drag axis "${axis}"`);
        return value as MotionValue<number>;
    }

    private resolveConstraints(): void {
        const { dragConstraints, onMeasureDragConstraints } = this.props;
        if (!dragConstraints) {
            this.constraints = { x: {}, y: {} };
            return;
        }
        if (!("current" in dragConstraints)) {
            this.constraints = {
                x: { min: dragConstraints.left, max: dragConstraints.right },
                y: { min: dragConstraints.top, max: dragConstraints.bottom },
            };
            return;
        }
        const widget = this.node.current;
        const container = dragConstraints.current as Gtk.Widget | null;
        if (!widget || !container) {
            this.constraints = { x: {}, y: {} };
            return;
        }
        const layout = measureWidgetBounds(widget);
        const bounds = measureWidgetBounds(container);
        let measured = {
            left: bounds.x.min - layout.x.min,
            right: bounds.x.max - layout.x.max,
            top: bounds.y.min - layout.y.min,
            bottom: bounds.y.max - layout.y.max,
        };
        if (onMeasureDragConstraints) {
            const adjusted = onMeasureDragConstraints(measured);
            if (adjusted) measured = adjusted;
        }
        this.constraints = {
            x: { min: measured.left, max: measured.right },
            y: { min: measured.top, max: measured.bottom },
        };
    }

    begin(startPoint: Point, claim: (() => void) | null): void {
        this.isDragging = false;
        this.currentDirection = null;
        this.startPoint = startPoint;
        this.lastOffset = { x: 0, y: 0 };
        this.claim = claim;
    }

    private startDragging(event: SyntheticPointerEvent, offset: Point): boolean {
        const { drag, dragDirectionLock, dragPropagation, onDirectionLock, onDragStart } = this.props;
        if (!dragPropagation) {
            this.releaseDragLock = setDragLock(drag ?? true);
            if (this.releaseDragLock === null) return false;
        }
        if (dragDirectionLock) {
            this.currentDirection = getCurrentDirection(offset);
            if (this.currentDirection === null) return false;
            onDirectionLock?.(this.currentDirection);
        }
        this.isDragging = true;
        this.resolveConstraints();
        for (const axis of DRAG_AXES) {
            if (!shouldDrag(axis, drag, this.currentDirection)) continue;
            const value = this.axisValue(axis);
            value.stop();
            this.originValues[axis] = value.get();
        }
        if (!dragPropagation) this.claim?.();
        this.node.animationState?.setActive("whileDrag", true);
        onDragStart?.(event as unknown as PointerEvent, this.info(offset));
        return true;
    }

    private info(offset: Point): PanInfo {
        const velocity = {
            x: this.axisValue("x").getVelocity(),
            y: this.axisValue("y").getVelocity(),
        };
        const point = { x: this.startPoint.x + offset.x, y: this.startPoint.y + offset.y };
        return panInfoFor(point, deltaFrom(offset, this.lastOffset), offset, velocity);
    }

    update(event: SyntheticPointerEvent, offset: Point): void {
        if (!this.isDragging) {
            if (Math.hypot(offset.x, offset.y) < START_THRESHOLD) return;
            if (!this.startDragging(event, offset)) return;
        }
        const { drag, dragElastic, onDrag } = this.props;
        const elastic = resolveElastic(dragElastic);
        for (const axis of DRAG_AXES) {
            if (!shouldDrag(axis, drag, this.currentDirection)) continue;
            const next = this.originValues[axis] + offset[axis];
            this.axisValue(axis).set(applyConstraints(next, this.constraints[axis], elastic[axis]));
        }
        onDrag?.(event as unknown as PointerEvent, this.info(offset));
        this.lastOffset = offset;
    }

    end(event: SyntheticPointerEvent, offset: Point): void {
        const wasDragging = this.isDragging;
        this.isDragging = false;
        this.releaseDragLock?.();
        this.releaseDragLock = null;
        this.claim = null;
        if (!wasDragging) return;
        const info = this.info(offset);
        this.node.animationState?.setActive("whileDrag", false);
        const { drag, dragMomentum = true, dragSnapToOrigin, onDragEnd } = this.props;
        for (const axis of DRAG_AXES) {
            if (!shouldDrag(axis, drag, this.currentDirection)) continue;
            if (dragSnapToOrigin || dragMomentum) this.startMomentum(axis, dragSnapToOrigin === true);
        }
        onDragEnd?.(event as unknown as PointerEvent, info);
    }

    cancel(): void {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.releaseDragLock?.();
        this.releaseDragLock = null;
        this.claim = null;
        this.node.animationState?.setActive("whileDrag", false);
    }

    private startMomentum(axis: DragAxis, snapToOrigin: boolean): void {
        const { dragMomentum = true, dragTransition } = this.props;
        const value = this.axisValue(axis);
        const constraints = snapToOrigin ? { min: 0, max: 0 } : this.constraints[axis];
        const transition = {
            type: "inertia" as const,
            velocity: dragMomentum ? value.getVelocity() : 0,
            bounceStiffness: 500,
            bounceDamping: 10,
            timeConstant: 750,
            restDelta: 1,
            restSpeed: 10,
            ...dragTransition,
            ...constraints,
        };
        value.start(animateMotionValue(axis, value, 0, transition, this.node));
    }
}

const sessionPoint = (widget: Gtk.Widget, gesture: Gtk.GestureDrag): Point => {
    const [hasStart, startX, startY] = gesture.getStartPoint();
    const bounds = measureWidgetBounds(widget);
    return hasStart ? { x: bounds.x.min + startX, y: bounds.y.min + startY } : { x: bounds.x.min, y: bounds.y.min };
};

export class DragFeature extends ControllerFeature<Gtk.GestureDrag> {
    private session: GtkDragSession | null = null;
    private unsubscribeControls: VoidFunction | null = null;
    private subscribedControls: DragControls | null = null;

    private ensureSession(): GtkDragSession {
        this.session ??= new GtkDragSession(this.node as GtkVisualElement);
        return this.session;
    }

    protected createController(widget: Gtk.Widget): Gtk.GestureDrag {
        const gesture = new GestureDrag();
        gesture.setPropagationPhase(PropagationPhase.CAPTURE);
        const claim = (): void => {
            gesture.setState(EventSequenceState.CLAIMED);
        };
        const forward = (
            type: string,
            offset: Point,
            dispatch: (session: GtkDragSession, event: SyntheticPointerEvent, offset: Point) => void,
        ): void => {
            if (this.node.getProps().dragListener === false) return;
            const point = sessionPoint(widget, gesture);
            const [event] = pointerEventAtPoint(type, widget, point.x + offset.x, point.y + offset.y);
            dispatch(this.ensureSession(), event, offset);
        };
        gesture.on("drag-begin", (startX, startY) => {
            if (this.node.getProps().dragListener === false) return;
            const bounds = measureWidgetBounds(widget);
            this.ensureSession().begin({ x: bounds.x.min + startX, y: bounds.y.min + startY }, claim);
        });
        gesture.on("drag-update", (offsetX, offsetY) =>
            forward("pointermove", { x: offsetX, y: offsetY }, (session, event, offset) =>
                session.update(event, offset),
            ),
        );
        gesture.on("drag-end", (offsetX, offsetY) =>
            forward("pointerup", { x: offsetX, y: offsetY }, (session, event, offset) => session.end(event, offset)),
        );
        return gesture;
    }

    override mount(): void {
        super.mount();
        this.subscribeDragControls();
    }

    private manualCleanup: VoidFunction | null = null;

    private endManualTracking(): void {
        this.manualCleanup?.();
        this.manualCleanup = null;
    }

    private beginManualTracking(startPoint: Point): void {
        this.endManualTracking();
        const widget = this.node.current;
        const root = widget?.getRoot() as unknown as Gtk.Widget | null;
        if (!widget || !root) return;
        const session = this.ensureSession();
        session.begin(startPoint, null);
        let lastOffset: Point = { x: 0, y: 0 };
        const motionController = new EventControllerMotion();
        motionController.setPropagationPhase(PropagationPhase.CAPTURE);
        motionController.on("motion", (x, y) => {
            lastOffset = { x: x - startPoint.x, y: y - startPoint.y };
            const [event] = pointerEventAtPoint("pointermove", widget, x, y);
            session.update(event, lastOffset);
        });
        const releaseController = new EventControllerLegacy();
        releaseController.setPropagationPhase(PropagationPhase.CAPTURE);
        releaseController.on("event", (event) => {
            if (event.getEventType() === EventType.BUTTON_RELEASE) {
                const [endEvent] = pointerEventAtPoint(
                    "pointerup",
                    widget,
                    startPoint.x + lastOffset.x,
                    startPoint.y + lastOffset.y,
                );
                session.end(endEvent, lastOffset);
                this.endManualTracking();
            }
            return false;
        });
        root.addController(motionController);
        root.addController(releaseController);
        this.manualCleanup = (): void => {
            root.removeController(motionController);
            root.removeController(releaseController);
        };
    }

    private subscribeDragControls(): void {
        const { dragControls } = this.node.getProps();
        if (dragControls === this.subscribedControls) return;
        this.unsubscribeControls?.();
        this.unsubscribeControls = null;
        this.subscribedControls = dragControls ?? null;
        if (!dragControls) return;
        const session = this.ensureSession();
        const controls = {
            start: (event: PointerEvent): void => {
                this.beginManualTracking({ x: event.pageX ?? 0, y: event.pageY ?? 0 });
            },
            cancel: (): void => {
                this.endManualTracking();
                session.cancel();
            },
            stop: (): void => {
                this.endManualTracking();
                session.cancel();
            },
        };
        const subscribable = dragControls as unknown as { subscribe: (controls: unknown) => VoidFunction };
        this.unsubscribeControls = subscribable.subscribe(controls);
    }

    override update(): void {
        this.subscribeDragControls();
    }

    override unmount(): void {
        this.endManualTracking();
        this.unsubscribeControls?.();
        this.unsubscribeControls = null;
        this.subscribedControls = null;
        this.session?.cancel();
        super.unmount();
    }
}

export class PanFeature extends ControllerFeature<Gtk.GestureDrag> {
    private isPanning = false;
    private lastOffset: Point = { x: 0, y: 0 };
    private lastTime = 0;
    private velocity: Point = { x: 0, y: 0 };

    private panInfo(widget: Gtk.Widget, gesture: Gtk.GestureDrag, offset: Point): PanInfo {
        const start = sessionPoint(widget, gesture);
        const delta = deltaFrom(offset, this.lastOffset);
        const now = performance.now();
        const elapsed = now - this.lastTime;
        if (elapsed > 0 && elapsed < 100) {
            this.velocity = { x: (delta.x / elapsed) * 1000, y: (delta.y / elapsed) * 1000 };
        }
        this.lastTime = now;
        return panInfoFor({ x: start.x + offset.x, y: start.y + offset.y }, delta, offset, this.velocity);
    }

    protected createController(widget: Gtk.Widget): Gtk.GestureDrag {
        const gesture = new GestureDrag();
        gesture.on("drag-begin", (startX, startY) => {
            this.isPanning = false;
            this.lastOffset = { x: 0, y: 0 };
            this.velocity = { x: 0, y: 0 };
            this.lastTime = performance.now();
            const [event, info] = pointerEventFor("pointerdown", widget, startX, startY);
            const sessionInfo = {
                ...info,
                delta: { x: 0, y: 0 },
                offset: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
            } as unknown as Parameters<NonNullable<MotionProps["onPanSessionStart"]>>[1];
            this.node.getProps().onPanSessionStart?.(event as unknown as PointerEvent, sessionInfo);
        });
        gesture.on("drag-update", (offsetX, offsetY) => {
            const offset = { x: offsetX, y: offsetY };
            const props = this.node.getProps();
            const info = this.panInfo(widget, gesture, offset);
            if (!this.isPanning) {
                if (Math.hypot(offsetX, offsetY) < START_THRESHOLD) return;
                this.isPanning = true;
                const [event] = pointerEventAtPoint("pointermove", widget, info.point.x, info.point.y);
                props.onPanStart?.(event as unknown as PointerEvent, info);
            }
            const [event] = pointerEventAtPoint("pointermove", widget, info.point.x, info.point.y);
            props.onPan?.(event as unknown as PointerEvent, info);
            this.lastOffset = offset;
        });
        gesture.on("drag-end", (offsetX, offsetY) => {
            if (!this.isPanning) return;
            this.isPanning = false;
            const info = this.panInfo(widget, gesture, { x: offsetX, y: offsetY });
            const [event] = pointerEventAtPoint("pointerup", widget, info.point.x, info.point.y);
            this.node.getProps().onPanEnd?.(event as unknown as PointerEvent, info);
        });
        return gesture;
    }
}
