import {
    animated,
    type MotionStyle,
    type MotionValue,
    type TargetAndTransition,
    useMotionTemplate,
    useMotionValue,
    useMotionValueEvent,
    useSpring,
    useTransform,
    useVelocity,
} from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { Slider } from "../../components/slider.js";
import { Stage } from "../../components/stage.js";
import type { Scene } from "../types.js";
import sourceCode from "./motion-values.tsx?raw";

const PULSE_STYLE: MotionStyle = { backgroundColor: "#33d17a", borderRadius: 40, opacity: 1 };

const PULSE = { opacity: [1, 0.2, 1] } satisfies TargetAndTransition;

const formatOpacity = (value: string | number | undefined): string =>
    typeof value === "number" ? value.toFixed(2) : (value ?? "1.00");

type DialProps = {
    rotate: MotionValue<number>;
    tint: MotionValue<string>;
    boxShadow: MotionValue<string>;
};

const Dial = ({ rotate, tint, boxShadow }: DialProps) => (
    <animated.GtkBox
        widthRequest={120}
        heightRequest={120}
        style={{ rotate, backgroundColor: tint, boxShadow, borderRadius: 18 }}
    />
);

const Percentage = ({ text }: { text: MotionValue<string> }) => (
    <animated.GtkLabel cssClasses={["title-1"]} widthRequest={90}>
        {text}
    </animated.GtkLabel>
);

const Pulse = ({ onOpacity }: { onOpacity: (value: string) => void }) => (
    <animated.GtkBox
        widthRequest={80}
        heightRequest={80}
        style={PULSE_STYLE}
        animate={PULSE}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        onUpdate={(values) => onOpacity(formatOpacity(values.opacity))}
    />
);

const Controls = ({ onProgress, onReset }: { onProgress: (value: number) => void; onReset: () => void }) => (
    <>
        <Slider label="Progress" initialValue={0} lower={0} upper={100} step={1} onChange={onProgress} />
        <GtkButton label="Reset peak" cssClasses={["pill"]} onClicked={onReset} />
    </>
);

const MotionValues = () => {
    const progress = useMotionValue(0);
    const smooth = useSpring(progress, { stiffness: 180, damping: 22 });
    const velocity = useVelocity(smooth);
    const rotate = useTransform(smooth, [0, 100], [0, 360]);
    const tint = useTransform(smooth, [0, 50, 100], ["#3584e4", "#9141ac", "#e01b24"]);
    const blurRadius = useTransform(smooth, [0, 100], [2, 26]);
    const boxShadow = useMotionTemplate`0 ${blurRadius}px 40px rgba(0, 0, 0, 0.4)`;
    const percentage = useTransform(smooth, (value) => `${Math.round(value)}%`);
    const [peak, setPeak] = useState(0);
    const [opacity, setOpacity] = useState("1.00");

    useMotionValueEvent(velocity, "change", (value) => {
        setPeak((current) => Math.max(current, Math.round(Math.abs(value))));
    });

    return (
        <Stage
            controls={<Controls onProgress={(value) => progress.set(value)} onReset={() => setPeak(0)} />}
            readout={`peak velocity ${peak}   live opacity ${opacity}`}
        >
            <GtkBox spacing={24} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                <Dial rotate={rotate} tint={tint} boxShadow={boxShadow} />
                <Percentage text={percentage} />
                <Pulse onOpacity={setOpacity} />
            </GtkBox>
        </Stage>
    );
};

export const motionValuesScene: Scene = {
    id: "motion-values",
    section: "Orchestration",
    title: "Motion Values",
    summary:
        "Drive a rotation, a color, a shadow and a live label from one motion value, without a single React render " +
        "per frame.",
    features: [
        "useMotionValue",
        "useSpring following a value",
        "useVelocity",
        "useTransform function",
        "useTransform numeric range",
        "useTransform color range",
        "useMotionTemplate",
        "useMotionValueEvent",
        "motion values in style",
        "motion value as children",
        "onUpdate",
    ],
    notes: [
        "A motion value in style bypasses React: the slider writes the value, the spring follows it, and every " +
            "derived transform repaints the widget without a re-render.",
        "useSpring turns a stepped slider into a continuous signal, which is what makes useVelocity meaningful.",
        "useMotionTemplate stitches motion values into one CSS string, so a numeric blur radius becomes a box shadow.",
        "A motion value passed as children of an animated label is written straight to the label property.",
        "onUpdate reports resolved values every frame. Round or format before storing them in state so React only " +
            "re-renders when the displayed text actually changes.",
    ],
    component: MotionValues,
    sourceCode,
};
