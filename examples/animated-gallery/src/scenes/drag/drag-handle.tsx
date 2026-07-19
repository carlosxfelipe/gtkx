import {
    animated,
    type DragControls,
    type MotionValue,
    pointerEventFromController,
    type TargetAndTransition,
    type Transition,
    useDragControls,
    useMotionValue,
    useTransform,
} from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkEntry, GtkGestureDrag, GtkImage, GtkLabel } from "@gtkx/jsx/gtk";
import { EventLog } from "../../components/event-log.js";
import { Stage } from "../../components/stage.js";
import { useEventLog } from "../../hooks/use-event-log.js";
import { chipStyle, handleRowStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./drag-handle.tsx?raw";

const CARD_BASE = {
    backgroundColor: "#241f31",
    borderRadius: 14,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
};

const CARD_DRAGGING: TargetAndTransition = {
    scale: 1.05,
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.5)",
};

const CARD_TRANSITION: Transition = { type: "spring", stiffness: 380, damping: 30 };

const TILT_INPUT = [-220, 220];

const TILT_OUTPUT = [-10, 10];

type Offsets = {
    dragX: MotionValue<number>;
    dragY: MotionValue<number>;
};

const PositionReadout = ({ dragX, dragY }: Offsets) => {
    const position = useTransform(
        [dragX, dragY],
        ([x = 0, y = 0]: number[]) => `x ${Math.round(x)}  y ${Math.round(y)}`,
    );

    return (
        <animated.GtkLabel name="drag-handle-position" cssClasses={[chipStyle]} halign={Gtk.Align.START}>
            {position}
        </animated.GtkLabel>
    );
};

const HandleAside = ({ dragX, dragY, entries }: Offsets & { entries: string[] }) => (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={10} valign={Gtk.Align.START}>
        <PositionReadout dragX={dragX} dragY={dragY} />
        <EventLog entries={entries} />
    </GtkBox>
);

type CardProps = Offsets & {
    controls: DragControls;
    onLog: (entry: string) => void;
};

const HandleCard = ({ controls, dragX, dragY, onLog }: CardProps) => {
    const tilt = useTransform(dragX, TILT_INPUT, TILT_OUTPUT);

    return (
        <animated.GtkBox
            name="drag-handle-card"
            orientation={Gtk.Orientation.VERTICAL}
            widthRequest={300}
            cssClasses={["card"]}
            drag
            dragListener={false}
            dragControls={controls}
            dragMomentum={false}
            _dragX={dragX}
            _dragY={dragY}
            style={{ ...CARD_BASE, rotate: tilt }}
            whileDrag={CARD_DRAGGING}
            transition={CARD_TRANSITION}
            onDragStart={() => onLog("onDragStart from the handle")}
            onDragEnd={() => onLog("onDragEnd")}
        >
            <GtkBox spacing={10} cssClasses={[handleRowStyle]}>
                <GtkImage
                    name="drag-handle-grip"
                    iconName="list-drag-handle-symbolic"
                    controllers={
                        <GtkGestureDrag
                            onDragBegin={(_startX, _startY, gesture) =>
                                controls.start(pointerEventFromController(gesture))
                            }
                        />
                    }
                />
                <GtkLabel hexpand xalign={0} label="Drag by the handle" />
            </GtkBox>
            <GtkEntry placeholderText="This entry keeps its caret" marginStart={8} marginEnd={8} marginBottom={8} />
        </animated.GtkBox>
    );
};

type ControlsProps = {
    onCancel: () => void;
    onReset: () => void;
};

const HandleControls = ({ onCancel, onReset }: ControlsProps) => (
    <>
        <GtkButton name="drag-handle-cancel" label="Cancel drag" cssClasses={["pill"]} onClicked={onCancel} />
        <GtkButton name="drag-handle-reset" label="Return to origin" cssClasses={["pill"]} onClicked={onReset} />
    </>
);

const DragHandle = () => {
    const controls = useDragControls();
    const dragX = useMotionValue(0);
    const dragY = useMotionValue(0);
    const { entries, log } = useEventLog();

    const handleCancel = () => {
        controls.cancel();
        log("dragControls.cancel()");
    };

    const handleReset = () => {
        dragX.set(0);
        dragY.set(0);
        log("offsets reset to zero");
    };

    return (
        <Stage
            readout="Only the grip icon starts a drag, so the card body and the entry keep their own input."
            aside={<HandleAside dragX={dragX} dragY={dragY} entries={entries} />}
            controls={<HandleControls onCancel={handleCancel} onReset={handleReset} />}
        >
            <HandleCard controls={controls} dragX={dragX} dragY={dragY} onLog={log} />
        </Stage>
    );
};

export const dragHandleScene: Scene = {
    id: "drag-handle",
    section: "Drag",
    title: "Drag Handles",
    summary: "Start a drag from a separate handle widget while the card body stays interactive.",
    features: [
        "useDragControls",
        "dragControls.start",
        "dragControls.cancel",
        "pointerEventFromController",
        "dragListener",
        "_dragX",
        "_dragY",
        "dragMomentum",
        "whileDrag",
        "useTransform",
    ],
    notes: [
        "dragListener set to false stops the card from listening for its own presses, so the only way in is dragControls.start.",
        "pointerEventFromController turns a live GTK controller into the pointer event dragControls.start expects, reading the gesture point and converting widget local coordinates to root coordinates.",
        "The grip carries its own Gtk.GestureDrag, which is what makes the entry below it keep its caret and text selection.",
        "_dragX and _dragY hand the drag its position values, so the tilt transform and the position label read the same source the gesture writes.",
        "dragControls.cancel resets whileDrag without firing onDragEnd and without running momentum, so the card stays where it was released. dragControls.stop behaves the same way here.",
        "The drag is delivered as a CSS transform, so the card keeps its original allocation and the layout around it never reflows.",
    ],
    component: DragHandle,
    sourceCode,
};
