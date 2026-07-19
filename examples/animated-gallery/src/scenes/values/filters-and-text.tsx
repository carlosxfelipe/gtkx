import {
    animate,
    animated,
    type MotionValue,
    type TargetAndTransition,
    useMotionTemplate,
    useMotionValue,
    useTransform,
} from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkCheckButton } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { Slider } from "../../components/slider.js";
import { Stage } from "../../components/stage.js";
import { arenaStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./filters-and-text.tsx?raw";

const TEXT_BASE = {
    color: "#77767b",
    fontSize: 18,
    fontWeight: 400,
    letterSpacing: "0px",
    lineHeight: "1.2",
    textShadow: "0 0 0 rgba(0, 0, 0, 0)",
    textDecorationLine: "none",
    textTransform: "none",
} satisfies TargetAndTransition;

const TEXT_EMPHASIS = {
    color: "#e01b24",
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: "2px",
    lineHeight: "1.5",
    textShadow: "0 2px 8px rgba(224, 27, 36, 0.4)",
    textDecorationLine: "underline",
    textTransform: "uppercase",
} satisfies TargetAndTransition;

const CARET_COOL = { caretColor: "#3584e4" } satisfies TargetAndTransition;

const CARET_WARM = { caretColor: "#e66100" } satisfies TargetAndTransition;

const BACKDROP_REST = { backdropFilter: "blur(0px)" } satisfies TargetAndTransition;

const BACKDROP_HOVER = { backdropFilter: "blur(8px)" } satisfies TargetAndTransition;

type ControlsProps = {
    blur: MotionValue<number>;
    hueRotate: MotionValue<number>;
    count: MotionValue<number>;
    warmCaret: boolean;
    onEmphasize: () => void;
    onWarmCaretChange: (value: boolean) => void;
};

const Controls = ({ blur, hueRotate, count, warmCaret, onEmphasize, onWarmCaretChange }: ControlsProps) => {
    const runCount = () => {
        count.jump(0);
        animate(count, 250, { duration: 1.2, ease: "easeOut" });
    };

    return (
        <>
            <Slider
                label="blur px"
                initialValue={0}
                lower={0}
                upper={12}
                step={0.5}
                digits={1}
                onChange={(value) => blur.set(value)}
            />
            <Slider
                label="hue rotate"
                initialValue={0}
                lower={0}
                upper={360}
                step={5}
                onChange={(value) => hueRotate.set(value)}
            />
            <GtkButton label="Count to 250" cssClasses={["pill"]} onClicked={runCount} />
            <GtkButton label="Emphasize" cssClasses={["pill"]} onClicked={onEmphasize} />
            <GtkCheckButton
                label="Warm caret"
                active={warmCaret}
                onToggled={(button) => onWarmCaretChange(button.getActive())}
            />
        </>
    );
};

const BackdropPanel = () => (
    <GtkBox cssClasses={[arenaStyle]} widthRequest={320} heightRequest={90}>
        <animated.GtkLabel
            cssClasses={["title-4"]}
            hexpand
            vexpand
            label="Hover for backdropFilter"
            style={BACKDROP_REST}
            whileHover={BACKDROP_HOVER}
            animate={BACKDROP_REST}
            transition={{ duration: 0.3 }}
        />
    </GtkBox>
);

const FiltersAndText = () => {
    const blur = useMotionValue(0);
    const hueRotate = useMotionValue(0);
    const filter = useMotionTemplate`blur(${blur}px) hue-rotate(${hueRotate}deg) saturate(1.3)`;
    const count = useMotionValue(0);
    const countText = useTransform(count, (value) => `${Math.round(value)} items`);
    const [emphasized, setEmphasized] = useState(false);
    const [warmCaret, setWarmCaret] = useState(false);

    return (
        <Stage
            controls={
                <Controls
                    blur={blur}
                    hueRotate={hueRotate}
                    count={count}
                    warmCaret={warmCaret}
                    onEmphasize={() => setEmphasized((value) => !value)}
                    onWarmCaretChange={setWarmCaret}
                />
            }
        >
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={18} halign={Gtk.Align.CENTER}>
                <animated.GtkLabel cssClasses={["title-1"]} label="Filtered" style={{ filter, color: "#3584e4" }} />
                <animated.GtkLabel cssClasses={["title-2"]}>{countText}</animated.GtkLabel>
                <animated.GtkLabel
                    label="Emphasis"
                    style={TEXT_BASE}
                    animate={emphasized ? TEXT_EMPHASIS : TEXT_BASE}
                    transition={{ duration: 0.4 }}
                />
                <animated.GtkEntry
                    widthRequest={280}
                    placeholderText="The caret color animates"
                    style={CARET_COOL}
                    animate={warmCaret ? CARET_WARM : CARET_COOL}
                    transition={{ duration: 0.3 }}
                />
                <BackdropPanel />
            </GtkBox>
        </Stage>
    );
};

export const filtersAndTextScene: Scene = {
    id: "filters-and-text",
    section: "Values",
    title: "Filters and Text",
    summary:
        "Compose a live filter string from motion values, animate font metrics and text decoration, and drive label text straight from a MotionValue.",
    features: [
        "filter",
        "backdropFilter",
        "useMotionTemplate",
        "useTransform",
        "fontSize",
        "fontWeight",
        "letterSpacing",
        "lineHeight",
        "textShadow",
        "textDecorationLine",
        "textTransform",
        "caretColor",
        "MotionValue children",
    ],
    notes: [
        "useMotionTemplate builds a live CSS string out of motion values, so dragging the sliders repaints the filter without re-rendering React.",
        "A MotionValue passed as children is written to the widget label on every change, which is the animated text route on GTK. Motion values in any other widget prop are filtered out before they reach the widget.",
        "letterSpacing and lineHeight are written as strings because motion appends no unit to them, while fontSize and fontWeight take plain numbers.",
        "Every animated value lands as GTK CSS text, so filter and backdropFilter run through the GTK CSS filter implementation rather than any widget property.",
        "The static bases live in style, which is the only place the visual element can read a from keyframe for color, shadow, and font values.",
    ],
    component: FiltersAndText,
    sourceCode,
};
