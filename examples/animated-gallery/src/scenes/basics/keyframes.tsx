import type { Easing, Transition } from "@gtkx/animated";
import { animated } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkCheckButton, GtkLabel } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { Slider } from "../../components/slider.js";
import { Stage } from "../../components/stage.js";
import { arenaStyle, chipStyle, monoStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./keyframes.tsx?raw";

type Stop = { id: string; time: number; color: string; radius: number };

const FIRST_STOP: Stop = { id: "start", time: 0, color: "#3584e4", radius: 12 };

const STOPS: Stop[] = [
    FIRST_STOP,
    { id: "quarter", time: 0.25, color: "#9141ac", radius: 12 },
    { id: "half", time: 0.5, color: "#e01b24", radius: 40 },
    { id: "three-quarters", time: 0.75, color: "#f6d32d", radius: 40 },
    { id: "end", time: 1, color: "#3584e4", radius: 12 },
];

const EVEN_TIMES: number[] = STOPS.map((stop) => stop.time);
const FRONT_LOADED_TIMES: number[] = [0, 0.1, 0.2, 0.3, 1];
const COLOR_KEYFRAMES: string[] = STOPS.map((stop) => stop.color);
const RADIUS_KEYFRAMES: number[] = STOPS.map((stop) => stop.radius);
const X_KEYFRAMES: number[] = [0, 180, 180, 0, 0];
const Y_KEYFRAMES: number[] = [0, 0, 120, 120, 0];
const ROTATE_KEYFRAMES: number[] = [0, 0, 180, 180, 0];
const SEGMENT_EASES: Easing[] = ["easeOut", "easeInOut", "easeInOut", "easeIn"];
const DEFAULT_DURATION = 3.2;

const StopRow = ({ stop }: { stop: Stop }) => (
    <GtkBox spacing={10} valign={Gtk.Align.CENTER}>
        <GtkLabel cssClasses={[chipStyle]} widthRequest={48} label={`${Math.round(stop.time * 100)}%`} />
        <animated.GtkBox
            widthRequest={30}
            heightRequest={30}
            style={{ backgroundColor: stop.color, borderRadius: stop.radius }}
        />
        <GtkLabel cssClasses={["dim-label", monoStyle]} xalign={0} label={`${stop.color} r${stop.radius}`} />
    </GtkBox>
);

const StopLegend = () => (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} valign={Gtk.Align.CENTER}>
        <GtkLabel cssClasses={["heading"]} xalign={0} label="Keyframe stops" />
        {STOPS.map((stop) => (
            <StopRow key={stop.id} stop={stop} />
        ))}
    </GtkBox>
);

const KeyframeSquare = ({ runId, transition }: { runId: number; transition: Transition }) => (
    <GtkBox cssClasses={[arenaStyle]} widthRequest={300} heightRequest={240}>
        <animated.GtkBox
            key={runId}
            widthRequest={80}
            heightRequest={80}
            halign={Gtk.Align.START}
            valign={Gtk.Align.START}
            marginTop={12}
            marginStart={12}
            style={{ backgroundColor: FIRST_STOP.color, borderRadius: FIRST_STOP.radius }}
            animate={{
                x: X_KEYFRAMES,
                y: Y_KEYFRAMES,
                rotate: ROTATE_KEYFRAMES,
                borderRadius: RADIUS_KEYFRAMES,
                backgroundColor: COLOR_KEYFRAMES,
            }}
            transition={transition}
        />
    </GtkBox>
);

type KeyframeControlsProps = {
    frontLoaded: boolean;
    perSegmentEase: boolean;
    onDuration: (value: number) => void;
    onFrontLoaded: (value: boolean) => void;
    onPerSegmentEase: (value: boolean) => void;
    onRestart: () => void;
};

const KeyframeControls = ({
    frontLoaded,
    perSegmentEase,
    onDuration,
    onFrontLoaded,
    onPerSegmentEase,
    onRestart,
}: KeyframeControlsProps) => (
    <>
        <Slider
            label="Duration"
            initialValue={DEFAULT_DURATION}
            lower={0.8}
            upper={6}
            step={0.1}
            digits={1}
            onChange={onDuration}
        />
        <GtkCheckButton
            label="Front-loaded times"
            active={frontLoaded}
            onToggled={(button: Gtk.CheckButton) => onFrontLoaded(button.getActive())}
        />
        <GtkCheckButton
            label="Per-segment ease"
            active={perSegmentEase}
            onToggled={(button: Gtk.CheckButton) => onPerSegmentEase(button.getActive())}
        />
        <GtkButton label="Restart" cssClasses={["pill"]} onClicked={onRestart} />
    </>
);

const Keyframes = () => {
    const [duration, setDuration] = useState(DEFAULT_DURATION);
    const [frontLoaded, setFrontLoaded] = useState(false);
    const [perSegmentEase, setPerSegmentEase] = useState(true);
    const [runId, setRunId] = useState(0);

    const times = frontLoaded ? FRONT_LOADED_TIMES : EVEN_TIMES;
    const easeLabel = perSegmentEase ? "per segment" : "linear";
    const transition: Transition = {
        duration,
        times,
        ease: perSegmentEase ? SEGMENT_EASES : "linear",
        repeat: Number.POSITIVE_INFINITY,
        repeatDelay: 0.4,
    };

    return (
        <Stage
            controls={
                <KeyframeControls
                    frontLoaded={frontLoaded}
                    perSegmentEase={perSegmentEase}
                    onDuration={setDuration}
                    onFrontLoaded={setFrontLoaded}
                    onPerSegmentEase={setPerSegmentEase}
                    onRestart={() => setRunId((value) => value + 1)}
                />
            }
            aside={<StopLegend />}
            readout={`times [${times.join(", ")}]  ease ${easeLabel}  duration ${duration.toFixed(1)}s`}
        >
            <KeyframeSquare runId={runId} transition={transition} />
        </Stage>
    );
};

export const keyframesScene: Scene = {
    id: "keyframes",
    section: "Basics",
    title: "Keyframes",
    summary: "One timeline moves, rotates, rounds and recolors a square across five keyframes.",
    features: [
        "animate with keyframe arrays",
        "transition.times",
        "per-segment ease array",
        "borderRadius keyframes",
        "backgroundColor keyframes",
        "repeat and repeatDelay",
    ],
    notes: [
        "times places each keyframe on the normalized timeline, so it holds one entry per keyframe.",
        "ease as an array gives every segment its own curve, so it holds one entry fewer than the keyframes.",
        "Color and radius keyframes keep a style base, since GTK reports start values only for transforms.",
    ],
    component: Keyframes,
    sourceCode,
};
