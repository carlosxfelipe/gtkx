import { animated, type Transition } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, type GtkBoxProps, GtkButton, GtkCheckButton } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { Slider } from "../../components/slider.js";
import { Stage } from "../../components/stage.js";
import { trackStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./springs.tsx?raw";

const Puck = ({ ref, ...props }: GtkBoxProps) => <GtkBox ref={ref} widthRequest={52} heightRequest={52} {...props} />;

const AnimatedPuck = animated.create(Puck);

type SpringSlidersProps = {
    onStiffness: (value: number) => void;
    onDamping: (value: number) => void;
    onMass: (value: number) => void;
};

const SpringSliders = ({ onStiffness, onDamping, onMass }: SpringSlidersProps) => (
    <>
        <Slider label="Stiffness" initialValue={260} lower={20} upper={800} step={10} onChange={onStiffness} />
        <Slider label="Damping" initialValue={20} lower={1} upper={60} step={1} onChange={onDamping} />
        <Slider label="Mass" initialValue={1} lower={0.2} upper={5} step={0.1} digits={1} onChange={onMass} />
    </>
);

type SpringTrackProps = {
    away: boolean;
    transition: Transition;
};

const SpringTrack = ({ away, transition }: SpringTrackProps) => (
    <GtkBox cssClasses={[trackStyle]} widthRequest={420} heightRequest={80} valign={Gtk.Align.CENTER}>
        <AnimatedPuck
            marginTop={14}
            marginStart={14}
            style={{ backgroundColor: "#33d17a", borderRadius: 26 }}
            initial={false}
            animate={{ x: away ? 340 : 0 }}
            transition={transition}
        />
    </GtkBox>
);

const Springs = () => {
    const [stiffness, setStiffness] = useState(260);
    const [damping, setDamping] = useState(20);
    const [mass, setMass] = useState(1);
    const [perceptual, setPerceptual] = useState(false);
    const [away, setAway] = useState(false);

    const transition: Transition = perceptual
        ? { type: "spring", visualDuration: 0.6, bounce: 0.4 }
        : { type: "spring", stiffness, damping, mass, restDelta: 0.01 };

    const readout = perceptual
        ? "visualDuration 0.6   bounce 0.4"
        : `stiffness ${stiffness}   damping ${damping}   mass ${mass.toFixed(1)}`;

    return (
        <Stage
            controls={
                <>
                    <SpringSliders onStiffness={setStiffness} onDamping={setDamping} onMass={setMass} />
                    <GtkCheckButton
                        label="Describe the spring by feel"
                        active={perceptual}
                        onToggled={(button: Gtk.CheckButton) => setPerceptual(button.getActive())}
                    />
                    <GtkButton
                        label={away ? "Fling back" : "Fling"}
                        cssClasses={["pill", "suggested-action"]}
                        onClicked={() => setAway((value) => !value)}
                    />
                </>
            }
            readout={readout}
        >
            <SpringTrack away={away} transition={transition} />
        </Stage>
    );
};

export const springsScene: Scene = {
    id: "springs",
    section: "Basics",
    title: "Springs",
    summary: "Tune a spring by physics or by feel and watch the same fling settle differently.",
    features: [
        'transition type: "spring"',
        "stiffness, damping, mass",
        "restDelta",
        "visualDuration and bounce",
        "animated.create",
        "initial={false}",
    ],
    notes: [
        "A spring has no fixed duration and can overshoot, which suits gestures better than discrete view swaps.",
        "visualDuration and bounce describe the same spring perceptually, and override stiffness, damping and mass.",
        "restDelta decides how close to the target counts as settled, ending the animation instead of easing forever.",
        "animated.create wraps any component that takes a ref prop and forwards it to a widget.",
        "initial={false} starts the puck at its animate target, so the first fling is its first movement.",
    ],
    component: Springs,
    sourceCode,
};
