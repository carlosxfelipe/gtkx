import type { BoundingBox, MotionStyle, MotionValue, PanInfo, TargetAndTransition, Transition } from "@gtkx/animated";
import { animated, useMotionValue, useTransform } from "@gtkx/animated";
import { DropDown } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkCheckButton, GtkLabel } from "@gtkx/jsx/gtk";
import { type RefObject, useRef, useState } from "react";
import { EventLog } from "../../components/event-log.js";
import { Stage } from "../../components/stage.js";
import { useEventLog } from "../../hooks/use-event-log.js";
import { arenaStyle, chipStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./drag.tsx?raw";

type DragAxis = boolean | "x" | "y";

type Options = {
    refBounds: boolean;
    perSideElastic: boolean;
    momentum: boolean;
    snapToOrigin: boolean;
    directionLock: boolean;
};

type Session = {
    offsetX: MotionValue<number>;
    offsetY: MotionValue<number>;
    report: (status: string, event: string) => void;
    end: (info: PanInfo) => void;
    onClick: () => void;
};

const AXES: { id: string; label: string; value: DragAxis }[] = [
    { id: "free", label: "drag", value: true },
    { id: "x", label: 'drag="x"', value: "x" },
    { id: "y", label: 'drag="y"', value: "y" },
];

const DEFAULT_AXIS = AXES[0] ?? { id: "free", label: "drag", value: true };

const TOGGLES: { key: keyof Options; label: string }[] = [
    { key: "refBounds", label: "constraints from the arena ref" },
    { key: "perSideElastic", label: "per-side dragElastic" },
    { key: "momentum", label: "dragMomentum" },
    { key: "snapToOrigin", label: "dragSnapToOrigin" },
    { key: "directionLock", label: "dragDirectionLock" },
];

const DEFAULT_OPTIONS: Options = {
    refBounds: true,
    perSideElastic: false,
    momentum: true,
    snapToOrigin: false,
    directionLock: false,
};

const BOX_CONSTRAINTS: Partial<BoundingBox> = { left: -150, right: 150, top: -90, bottom: 90 };

const PER_SIDE_ELASTIC: Partial<BoundingBox> = { left: 0.6, right: 0.1, top: 0.3, bottom: 0.3 };

const EVEN_ELASTIC = 0.3;

const CONSTRAINT_INSET = 12;

const RESTING_SHADOW = "0 2px 8px rgba(0, 0, 0, 0.3)";

const CARD_STYLE: MotionStyle = {
    backgroundColor: "#3584e4",
    color: "#ffffff",
    borderRadius: 16,
    boxShadow: RESTING_SHADOW,
};

const CARD_REST: TargetAndTransition = { scale: 1, boxShadow: RESTING_SHADOW };
const CARD_HOVER: TargetAndTransition = { scale: 1.03, boxShadow: RESTING_SHADOW };
const CARD_DRAGGING: TargetAndTransition = { scale: 1.1, boxShadow: "0 20px 46px rgba(0, 0, 0, 0.5)" };
const CARD_SPRING: Transition = { type: "spring", stiffness: 380, damping: 28 };

const DRAG_TRANSITION = { power: 0.3, timeConstant: 420, bounceStiffness: 380, bounceDamping: 24 };

const insetConstraints = (measured: BoundingBox): BoundingBox => ({
    ...measured,
    left: measured.left + CONSTRAINT_INSET,
    right: measured.right - CONSTRAINT_INSET,
});

type ControlsProps = {
    axisId: string;
    options: Options;
    onAxis: (id: string) => void;
    onToggle: (key: keyof Options, value: boolean) => void;
};

const DragControls = ({ axisId, options, onAxis, onToggle }: ControlsProps) => (
    <>
        <DropDown
            widthRequest={150}
            items={AXES.map((item) => ({ id: item.id, value: item.label }))}
            selectedId={axisId}
            onSelectionChanged={onAxis}
        />
        {TOGGLES.map(({ key, label }) => (
            <GtkCheckButton
                key={key}
                label={label}
                active={options[key]}
                onToggled={(button: Gtk.CheckButton) => onToggle(key, button.getActive())}
            />
        ))}
    </>
);

type OffsetProps = { offsetX: MotionValue<number>; offsetY: MotionValue<number> };

const OffsetChip = ({ offsetX, offsetY }: OffsetProps) => {
    const text = useTransform(
        [offsetX, offsetY],
        ([dx = 0, dy = 0]: number[]) => `offset ${Math.round(dx)}, ${Math.round(dy)}`,
    );

    return (
        <animated.GtkLabel name="drag-offset" cssClasses={[chipStyle]} halign={Gtk.Align.CENTER} marginBottom={12}>
            {text}
        </animated.GtkLabel>
    );
};

type CardProps = {
    axis: DragAxis;
    options: Options;
    arenaRef: RefObject<Gtk.Box | null>;
    session: Session;
};

const DragCard = ({ axis, options, arenaRef, session }: CardProps) => (
    <animated.GtkBox
        name="drag-card"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={6}
        widthRequest={160}
        heightRequest={110}
        hexpand
        vexpand
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        drag={axis}
        dragConstraints={options.refBounds ? arenaRef : BOX_CONSTRAINTS}
        onMeasureDragConstraints={insetConstraints}
        dragElastic={options.perSideElastic ? PER_SIDE_ELASTIC : EVEN_ELASTIC}
        dragMomentum={options.momentum}
        dragSnapToOrigin={options.snapToOrigin}
        dragTransition={DRAG_TRANSITION}
        dragDirectionLock={options.directionLock}
        dragPropagation={false}
        style={CARD_STYLE}
        animate={CARD_REST}
        whileHover={CARD_HOVER}
        whileDrag={CARD_DRAGGING}
        transition={CARD_SPRING}
        onDirectionLock={(direction) => session.report(`locked to ${direction}`, "onDirectionLock")}
        onDragStart={() => session.report("dragging", "onDragStart")}
        onDrag={(_event, info) => {
            session.offsetX.set(info.offset.x);
            session.offsetY.set(info.offset.y);
        }}
        onDragEnd={(_event, info) => session.end(info)}
    >
        <GtkLabel cssClasses={["heading"]} vexpand label="Drag me" />
        <GtkButton label="Still clickable" cssClasses={["flat"]} onClicked={session.onClick} />
    </animated.GtkBox>
);

type ArenaProps = { axis: DragAxis; options: Options; session: Session };

const DragArena = ({ axis, options, session }: ArenaProps) => {
    const arenaRef = useRef<Gtk.Box>(null);

    return (
        <GtkBox
            ref={arenaRef}
            name="drag-arena"
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={[arenaStyle]}
            widthRequest={440}
            heightRequest={280}
        >
            <DragCard axis={axis} options={options} arenaRef={arenaRef} session={session} />
            <OffsetChip offsetX={session.offsetX} offsetY={session.offsetY} />
        </GtkBox>
    );
};

const Drag = () => {
    const [axisId, setAxisId] = useState(DEFAULT_AXIS.id);
    const [options, setOptions] = useState(DEFAULT_OPTIONS);
    const [clicks, setClicks] = useState(0);
    const [status, setStatus] = useState("idle");
    const offsetX = useMotionValue(0);
    const offsetY = useMotionValue(0);
    const { entries, log } = useEventLog();
    const axis = (AXES.find((item) => item.id === axisId) ?? DEFAULT_AXIS).value;

    const report = (next: string, event: string) => {
        setStatus(next);
        log(event);
    };

    const end = (info: PanInfo) => {
        if (options.snapToOrigin) {
            offsetX.set(0);
            offsetY.set(0);
        }
        report(`released at ${Math.round(info.velocity.x)}, ${Math.round(info.velocity.y)} px/s`, "onDragEnd");
    };

    return (
        <Stage
            controls={
                <DragControls
                    axisId={axisId}
                    options={options}
                    onAxis={setAxisId}
                    onToggle={(key, value) => setOptions((current) => ({ ...current, [key]: value }))}
                />
            }
            aside={<EventLog entries={entries} />}
            readout={`${status} - inner button clicks: ${clicks}`}
        >
            <DragArena
                axis={axis}
                options={options}
                session={{ offsetX, offsetY, report, end, onClick: () => setClicks((count) => count + 1) }}
            />
        </Stage>
    );
};

export const dragScene: Scene = {
    id: "drag",
    section: "Drag",
    title: "Drag",
    summary: "Every drag prop on one card: axis locking, constraints, elasticity, momentum and the drag callbacks.",
    features: [
        "drag",
        "dragConstraints",
        "onMeasureDragConstraints",
        "dragElastic",
        "dragMomentum",
        "dragSnapToOrigin",
        "dragTransition",
        "dragDirectionLock",
        "onDirectionLock",
        "dragPropagation",
        "whileDrag",
        "onDragStart",
        "onDrag",
        "onDragEnd",
    ],
    notes: [
        "Drag runs a Gtk.GestureDrag in the capture phase that claims the GTK event sequence only after three pixels of movement, so a plain click still reaches the button inside the card and the counter rises.",
        "dragConstraints takes either a bounding box in pixels or a widget ref. Only the ref form is measured, so onMeasureDragConstraints runs only while the arena ref is selected.",
        "Constraints are resolved once when the drag starts, so a container that resizes mid-drag is not measured again.",
        "The card keeps its allocation while it moves because every transform is CSS, so siblings never reflow and the arena keeps its layout.",
        "dragElastic accepts one number for every edge or a per-side object, which makes the left edge stretch much further than the right one here.",
        "dragTransition tunes the inertia animation that momentum runs on release, and dragSnapToOrigin replaces it with a spring back to the start.",
        "The live offset is written into motion values from onDrag and rendered through a motion value passed as label children, which keeps the gesture off the React render path.",
    ],
    component: Drag,
    sourceCode,
};
