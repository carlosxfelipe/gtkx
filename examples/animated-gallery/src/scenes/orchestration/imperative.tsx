import {
    type AnimationPlaybackControls,
    animate,
    animated,
    type MotionValue,
    motionValue,
    useCycle,
    useMotionValue,
    useTransform,
    type ValueAnimationTransition,
} from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { type RefObject, useMemo, useRef } from "react";
import { Stage } from "../../components/stage.js";
import { monoStyle, trackStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./imperative.tsx?raw";

const TINT_REST = "#3584e4";
const TINT_MID = "#9141ac";
const TINT_WARM = "#e66100";
const RUN_DISTANCE = 320;
const COUNT_TARGET = 500;

const RUN_TRANSITION = { type: "spring", stiffness: 120, damping: 12 } satisfies ValueAnimationTransition<number>;

type PlaybackButtonsProps = {
    x: MotionValue<number>;
    controlsRef: RefObject<AnimationPlaybackControls | null>;
};

const PlaybackButtons = ({ x, controlsRef }: PlaybackButtonsProps) => {
    const run = () => {
        controlsRef.current?.stop();
        x.jump(0);
        controlsRef.current = animate(x, RUN_DISTANCE, RUN_TRANSITION);
    };

    const play = (speed: number) => {
        const controls = controlsRef.current;
        if (!controls) return;
        controls.speed = speed;
        controls.play();
    };

    const scrub = () => {
        const controls = controlsRef.current;
        if (controls) controls.time = controls.duration / 2;
    };

    return (
        <>
            <GtkButton label="Run" cssClasses={["pill", "suggested-action"]} onClicked={run} />
            <GtkButton label="Stop" cssClasses={["pill"]} onClicked={() => controlsRef.current?.stop()} />
            <GtkButton label="Complete" cssClasses={["pill"]} onClicked={() => controlsRef.current?.complete()} />
            <GtkButton label="Half speed" cssClasses={["pill"]} onClicked={() => play(0.5)} />
            <GtkButton label="Rewind" cssClasses={["pill"]} onClicked={() => play(-1)} />
            <GtkButton label="Scrub to middle" cssClasses={["pill"]} onClicked={scrub} />
            <GtkButton label="Reset" cssClasses={["pill"]} onClicked={() => x.jump(0)} />
        </>
    );
};

type ValueButtonsProps = {
    counter: MotionValue<number>;
    onCycleTint: () => void;
};

const ValueButtons = ({ counter, onCycleTint }: ValueButtonsProps) => {
    const count = () => {
        counter.jump(0);
        animate(0, COUNT_TARGET, { duration: 1.2, ease: "easeOut", onUpdate: (value) => counter.set(value) });
    };

    return (
        <>
            <GtkButton label="Count to 500" cssClasses={["pill"]} onClicked={count} />
            <GtkButton label="Cycle tint" cssClasses={["pill"]} onClicked={onCycleTint} />
        </>
    );
};

type TrackProps = {
    x: MotionValue<number>;
    tint: string;
};

const Track = ({ x, tint }: TrackProps) => {
    const xText = useTransform(x, (value) => `x ${Math.round(value)}`);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={14} halign={Gtk.Align.CENTER}>
            <GtkBox cssClasses={[trackStyle]} widthRequest={420} heightRequest={100} valign={Gtk.Align.CENTER}>
                <animated.GtkBox
                    widthRequest={72}
                    heightRequest={72}
                    marginTop={14}
                    marginStart={14}
                    style={{ x, backgroundColor: TINT_REST, borderRadius: 16 }}
                    animate={{ backgroundColor: tint }}
                    transition={{ duration: 0.3 }}
                />
            </GtkBox>
            <animated.GtkLabel cssClasses={["dim-label", monoStyle]}>{xText}</animated.GtkLabel>
        </GtkBox>
    );
};

const Counter = ({ counter }: { counter: MotionValue<number> }) => {
    const counterText = useTransform(counter, (value) => `${Math.round(value)}`);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} widthRequest={200} valign={Gtk.Align.START}>
            <GtkLabel cssClasses={["dim-label", monoStyle]} xalign={0} label="animate(0, 500, options)" />
            <animated.GtkLabel cssClasses={["title-2"]} xalign={0}>
                {counterText}
            </animated.GtkLabel>
        </GtkBox>
    );
};

const Imperative = () => {
    const x = useMemo(() => motionValue(0), []);
    const counter = useMotionValue(0);
    const controlsRef = useRef<AnimationPlaybackControls | null>(null);
    const [tint, cycleTint] = useCycle(TINT_REST, TINT_MID, TINT_WARM);

    return (
        <Stage
            controls={
                <>
                    <PlaybackButtons x={x} controlsRef={controlsRef} />
                    <ValueButtons counter={counter} onCycleTint={() => cycleTint()} />
                </>
            }
            aside={<Counter counter={counter} />}
            readout="Press Run, then Half speed, Rewind or Scrub while the spring is still in flight"
        >
            <Track x={x} tint={tint} />
        </Stage>
    );
};

export const imperativeScene: Scene = {
    id: "imperative",
    section: "Orchestration",
    title: "Imperative",
    summary:
        "Start an animation from an event handler and keep the playback controls around to stop, complete, scrub and " +
        "replay it at another speed.",
    features: [
        "motionValue",
        "animate(value, target, options)",
        "animate(from, to, options)",
        "AnimationPlaybackControls",
        "stop and complete",
        "speed and time",
        "onUpdate",
        "useCycle",
    ],
    notes: [
        "motionValue creates a value outside React, so an event handler can drive it without a re-render. " +
            "useMotionValue is the same factory tied to a component instance.",
        "animate returns playback controls. Holding on to them is what makes Stop, Complete, Rewind and Scrub " +
            "possible, so keep them in a ref rather than in state.",
        "Setting speed to a negative number plays backwards, and calling play afterwards restarts a finished " +
            "animation from its end rather than its start.",
        "time is writable, so assigning half the duration jumps straight to the middle frame.",
        "animate also takes plain numbers. Nothing is bound to a widget, and onUpdate forwards every frame wherever " +
            "you want it, here into a motion value rendered as label text.",
        "useCycle steps through a fixed list of states and returns a setter, which suits discrete swaps such as the " +
            "three tints better than a counter in state.",
    ],
    component: Imperative,
    sourceCode,
};
