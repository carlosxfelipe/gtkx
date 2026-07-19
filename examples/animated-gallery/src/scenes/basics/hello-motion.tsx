import { animated, type TargetAndTransition, type Transition } from "@gtkx/animated";
import { GtkButton } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { EventLog } from "../../components/event-log.js";
import { Stage } from "../../components/stage.js";
import { useEventLog } from "../../hooks/use-event-log.js";
import type { Scene } from "../types.js";
import sourceCode from "./hello-motion.tsx?raw";

const ENTER: TargetAndTransition = { opacity: 0, y: 28, scale: 0.9 };
const RESTING: TargetAndTransition = { opacity: 1, y: 0, scale: 1 };
const LIFTED: TargetAndTransition = { opacity: 1, y: -48, scale: 1.15 };
const TRANSITION: Transition = { duration: 0.5, ease: "easeOut" };

const HelloMotion = () => {
    const [lifted, setLifted] = useState(false);
    const [phase, setPhase] = useState("idle");
    const { entries, log } = useEventLog();

    const handleStart = () => {
        setPhase("running");
        log("onAnimationStart");
    };

    const handleComplete = () => {
        setPhase("complete");
        log("onAnimationComplete");
    };

    return (
        <Stage
            controls={
                <GtkButton
                    label={lifted ? "Lower" : "Lift"}
                    cssClasses={["pill", "suggested-action"]}
                    onClicked={() => setLifted((value) => !value)}
                />
            }
            aside={<EventLog entries={entries} />}
            readout={`lifecycle: ${phase}`}
        >
            <animated.GtkLabel
                cssClasses={["title-1"]}
                label="Hello, motion"
                initial={ENTER}
                animate={lifted ? LIFTED : RESTING}
                transition={TRANSITION}
                onAnimationStart={handleStart}
                onAnimationComplete={handleComplete}
            />
        </Stage>
    );
};

export const helloMotionScene: Scene = {
    id: "hello-motion",
    section: "Basics",
    title: "Hello Motion",
    summary:
        "The smallest animation there is: an enter state, a present state, and a transition between them, with lifecycle callbacks reporting each run.",
    features: ["initial", "animate", "transition", "duration", "ease", "onAnimationStart", "onAnimationComplete"],
    notes: [
        "initial is the state the widget holds before its enter animation, and animate is the state it settles into while present.",
        "animate restarts only when the new target is not shallow equal to the previous one, so switching between two named target objects is enough to drive it.",
        "Every value here is delivered as GTK CSS: opacity becomes an opacity declaration, and y and scale are folded into a single transform declaration.",
        "onAnimationStart and onAnimationComplete fire for the enter animation as well as for each toggle.",
    ],
    component: HelloMotion,
    sourceCode,
};
