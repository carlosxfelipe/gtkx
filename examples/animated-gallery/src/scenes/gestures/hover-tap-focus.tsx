import type { MotionStyle, TargetAndTransition, Transition } from "@gtkx/animated";
import { animated } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkCheckButton } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { EventLog } from "../../components/event-log.js";
import { Stage } from "../../components/stage.js";
import { useEventLog } from "../../hooks/use-event-log.js";
import type { Scene } from "../types.js";
import sourceCode from "./hover-tap-focus.tsx?raw";

type LogProp = { log: (entry: string) => void };

const HOVER_REST: TargetAndTransition = { scale: 1, opacity: 1 };
const HOVER_ACTIVE: TargetAndTransition = { scale: 1.08, opacity: 1 };
const HOVER_SPRING: Transition = { type: "spring", stiffness: 400, damping: 22 };

const TAP_REST: TargetAndTransition = { scale: 1 };
const TAP_ACTIVE: TargetAndTransition = { scale: 0.9 };
const TAP_SPRING: Transition = { type: "spring", stiffness: 500, damping: 24 };

const OUTLINE_BASE: MotionStyle = {
    outlineStyle: "solid",
    outlineOffset: "2px",
    outlineWidth: "0px",
    outlineColor: "rgba(53, 132, 228, 0)",
};
const OUTLINE_REST: TargetAndTransition = { outlineWidth: "0px", outlineColor: "rgba(53, 132, 228, 0)" };
const OUTLINE_ACTIVE: TargetAndTransition = { outlineWidth: "3px", outlineColor: "#3584e4" };
const OUTLINE_TRANSITION: Transition = { duration: 0.2 };

const LOCKED_STYLE: MotionStyle = { pointerEvents: "none" };
const UNLOCKED_STYLE: MotionStyle = { pointerEvents: "auto" };
const LOCKED_TARGET: TargetAndTransition = { opacity: 0.4 };
const UNLOCKED_TARGET: TargetAndTransition = { opacity: 1 };
const LOCK_TRANSITION: Transition = { duration: 0.2 };

const BUTTON_WIDTH = 220;

const HoverButton = ({ log }: LogProp) => (
    <animated.GtkButton
        label="Hover me"
        widthRequest={BUTTON_WIDTH}
        animate={HOVER_REST}
        whileHover={HOVER_ACTIVE}
        transition={HOVER_SPRING}
        onHoverStart={() => log("onHoverStart")}
        onHoverEnd={() => log("onHoverEnd")}
    />
);

const TapButton = ({ log }: LogProp) => (
    <animated.GtkButton
        label="Tap me"
        cssClasses={["pill", "suggested-action"]}
        widthRequest={BUTTON_WIDTH}
        animate={TAP_REST}
        whileTap={TAP_ACTIVE}
        transition={TAP_SPRING}
        onTapStart={() => log("onTapStart")}
        onTap={() => log("onTap")}
        onTapCancel={() => log("onTapCancel")}
        onClicked={() => log("onClicked")}
    />
);

const FocusButton = ({ log }: LogProp) => (
    <animated.GtkButton
        label="Tab to me"
        widthRequest={BUTTON_WIDTH}
        style={OUTLINE_BASE}
        animate={OUTLINE_REST}
        whileFocus={OUTLINE_ACTIVE}
        transition={OUTLINE_TRANSITION}
        onClicked={() => log("focus button onClicked")}
    />
);

const LockButton = ({ locked, log }: LogProp & { locked: boolean }) => (
    <animated.GtkButton
        label={locked ? "Not targetable" : "Targetable"}
        widthRequest={BUTTON_WIDTH}
        style={locked ? LOCKED_STYLE : UNLOCKED_STYLE}
        animate={locked ? LOCKED_TARGET : UNLOCKED_TARGET}
        transition={LOCK_TRANSITION}
        whileHover={HOVER_ACTIVE}
        onClicked={() => log("locked button clicked")}
    />
);

const HoverTapFocus = () => {
    const { entries, log } = useEventLog();
    const [locked, setLocked] = useState(false);

    return (
        <Stage
            aside={<EventLog entries={entries} />}
            controls={
                <GtkCheckButton
                    label="pointerEvents: none"
                    active={locked}
                    onToggled={(button: Gtk.CheckButton) => setLocked(button.getActive())}
                />
            }
            readout="Tab to the third button: whileFocus follows focus-visible"
        >
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={16} halign={Gtk.Align.CENTER}>
                <HoverButton log={log} />
                <TapButton log={log} />
                <FocusButton log={log} />
                <LockButton locked={locked} log={log} />
            </GtkBox>
        </Stage>
    );
};

export const hoverTapFocusScene: Scene = {
    id: "hover-tap-focus",
    section: "Gestures",
    title: "Hover, Tap and Focus",
    summary: "Gesture variants wired to GTK event controllers, plus pointerEvents as a hit-testing switch.",
    features: [
        "whileHover",
        "whileTap",
        "whileFocus",
        "onHoverStart",
        "onHoverEnd",
        "onTapStart",
        "onTap",
        "onTapCancel",
        "pointerEvents",
    ],
    notes: [
        "Hover comes from a Gtk.EventControllerMotion, presses from a Gtk.GestureClick restricted to the primary button, and focus from a Gtk.EventControllerFocus gated on the toplevel showing focus visibly.",
        "Activating a focused button with Enter or Space fires onClicked but not the tap gesture, which the event log makes visible.",
        "pointerEvents never reaches CSS: it is intercepted and applied with setCanTarget, which is why it lives in style alongside the other base values.",
        "The outline animation needs its base values in style because only transforms and opacity can be read back from a live widget.",
    ],
    component: HoverTapFocus,
    sourceCode,
};
