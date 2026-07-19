import { animated, type MotionStyle, type TargetAndTransition } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { EventLog } from "../../components/event-log.js";
import { Slider } from "../../components/slider.js";
import { Stage } from "../../components/stage.js";
import { useEventLog } from "../../hooks/use-event-log.js";
import type { Scene } from "../types.js";
import sourceCode from "./color-and-box.tsx?raw";

const BASE = {
    backgroundColor: "#3584e4",
    backgroundImage: "linear-gradient(120deg, #3584e4, #62a0ea)",
    color: "#ffffff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
    borderColor: "#1c71d8",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.25)",
    outlineWidth: "0px",
    outlineOffset: "0px",
    outlineColor: "rgba(53, 132, 228, 0)",
    padding: 12,
    margin: 0,
    minWidth: "180px",
    minHeight: "90px",
    opacity: 1,
} satisfies TargetAndTransition;

const EXPANDED = {
    backgroundColor: "#e01b24",
    backgroundImage: "linear-gradient(120deg, #e01b24, #f8e45c)",
    color: "#241f31",
    borderTopLeftRadius: 44,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 44,
    borderBottomLeftRadius: 8,
    borderWidth: 4,
    borderColor: "#f66151",
    boxShadow: "0 16px 40px rgba(224, 27, 36, 0.45)",
    outlineWidth: "3px",
    outlineOffset: "6px",
    outlineColor: "rgba(224, 27, 36, 0.6)",
    padding: 28,
    margin: 12,
    minWidth: "340px",
    minHeight: "200px",
    opacity: 0.92,
} satisfies TargetAndTransition;

const STYLE: MotionStyle = { ...BASE, borderStyle: "solid", outlineStyle: "solid" };

type BoxCardProps = {
    expanded: boolean;
    duration: number;
    onStart: () => void;
    onComplete: () => void;
};

const BoxCard = ({ expanded, duration, onStart, onComplete }: BoxCardProps) => (
    <animated.GtkBox
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        style={STYLE}
        animate={expanded ? EXPANDED : BASE}
        transition={{ duration, ease: "easeInOut" }}
        onAnimationStart={onStart}
        onAnimationComplete={onComplete}
    >
        <GtkLabel cssClasses={["title-3"]} hexpand vexpand label="Box model" />
    </animated.GtkBox>
);

const ColorAndBox = () => {
    const [expanded, setExpanded] = useState(false);
    const [duration, setDuration] = useState(0.5);
    const { entries, log } = useEventLog();
    const phase = expanded ? "expand" : "collapse";

    return (
        <Stage
            controls={
                <>
                    <GtkButton
                        label={expanded ? "Collapse" : "Expand"}
                        cssClasses={["pill", "suggested-action"]}
                        onClicked={() => setExpanded((value) => !value)}
                    />
                    <Slider
                        label="Duration"
                        initialValue={0.5}
                        lower={0.1}
                        upper={2}
                        step={0.1}
                        digits={2}
                        onChange={setDuration}
                    />
                </>
            }
            aside={<EventLog entries={entries} />}
            readout="minWidth and minHeight stand in for width and height"
        >
            <BoxCard
                expanded={expanded}
                duration={duration}
                onStart={() => log(`${phase} start`)}
                onComplete={() => log(`${phase} done`)}
            />
        </Stage>
    );
};

export const colorAndBoxScene: Scene = {
    id: "color-and-box",
    section: "Values",
    title: "Color and Box",
    summary:
        "Animate the whole GTK box model: gradients, per-corner radii, borders, shadows, outlines, spacing and the " +
        "minimum size that stands in for width and height.",
    features: [
        "backgroundColor",
        "backgroundImage",
        "color",
        "borderRadius corners",
        "borderWidth",
        "borderColor",
        "boxShadow",
        "outlineWidth",
        "outlineOffset",
        "outlineColor",
        "padding",
        "margin",
        "minWidth",
        "minHeight",
        "opacity",
    ],
    notes: [
        "GTK4 CSS has no width, height, top or left, so animate minWidth and minHeight or a transform instead.",
        "Motion appends px only for the properties it knows: borderRadius and its corners, margin, padding, " +
            "border widths and fontSize. Pass minWidth, minHeight, outlineWidth and outlineOffset as strings.",
        "Every animated value also appears in style. The render bridge can only read a starting value back from " +
            "the widget for transforms and opacity, so style supplies the from keyframe for everything else.",
    ],
    component: ColorAndBox,
    sourceCode,
};
