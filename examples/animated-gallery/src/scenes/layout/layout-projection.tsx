import { animated } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { EventLog } from "../../components/event-log.js";
import { Stage } from "../../components/stage.js";
import { useEventLog } from "../../hooks/use-event-log.js";
import { monoStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./layout-projection.tsx?raw";

type LayoutMode = boolean | "position" | "size";

const MODES: { id: string; label: string; value: LayoutMode }[] = [
    { id: "both", label: "layout", value: true },
    { id: "position", label: 'layout="position"', value: "position" },
    { id: "size", label: 'layout="size"', value: "size" },
];

type ProjectedCardProps = {
    mode: LayoutMode;
    label: string;
    expanded: boolean;
    onPhase: (phase: string) => void;
};

const ProjectedCard = ({ mode, label, expanded, onPhase }: ProjectedCardProps) => (
    <animated.GtkBox
        layout={mode}
        layoutDependency={expanded}
        widthRequest={expanded ? 260 : 130}
        heightRequest={expanded ? 110 : 64}
        cssClasses={["card"]}
        halign={expanded ? Gtk.Align.END : Gtk.Align.START}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        onLayoutAnimationStart={() => onPhase(`${label} start`)}
        onLayoutAnimationComplete={() => onPhase(`${label} complete`)}
    >
        <GtkLabel cssClasses={["dim-label", monoStyle]} hexpand vexpand label={label} />
    </animated.GtkBox>
);

const LayoutProjection = () => {
    const [expanded, setExpanded] = useState(false);
    const { entries, log } = useEventLog();

    const readout = expanded
        ? "expanded: wider, taller, pushed down and aligned to the end"
        : "collapsed: compact and aligned to the start";

    return (
        <Stage
            controls={
                <GtkButton
                    label={expanded ? "Shrink" : "Grow"}
                    cssClasses={["pill", "suggested-action"]}
                    onClicked={() => setExpanded((value) => !value)}
                />
            }
            aside={<EventLog entries={entries} />}
            readout={readout}
        >
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12} widthRequest={420}>
                {expanded ? <GtkBox heightRequest={60} /> : null}
                {MODES.map((mode) => (
                    <ProjectedCard
                        key={mode.id}
                        mode={mode.value}
                        label={mode.label}
                        expanded={expanded}
                        onPhase={log}
                    />
                ))}
            </GtkBox>
        </Stage>
    );
};

export const layoutProjectionScene: Scene = {
    id: "layout-projection",
    section: "Layout",
    title: "Layout Projection",
    summary:
        "One button changes the size request and alignment of every card at once, and projection turns each jump into a smooth transform.",
    features: [
        "layout",
        'layout="position"',
        'layout="size"',
        "layoutDependency",
        "onLayoutAnimationStart",
        "onLayoutAnimationComplete",
    ],
    notes: [
        "The widget is measured against the toplevel before and after the re-render, and the difference plays back as a transform, so the size request itself jumps while the transform smooths it out.",
        'layout={true} corrects both movement and resizing, layout="position" corrects only movement, and layout="size" corrects only resizing.',
        "layoutDependency tells the projection which value to watch, so a re-render that changes nothing about the layout skips the measure pass.",
        "onLayoutAnimationStart and onLayoutAnimationComplete bracket each card's projection animation, so the log fills up in pairs.",
        "Border radius and box shadow are not counter-scaled while a projection scale is playing, so keep the radius modest on widgets that change size a lot.",
        "layoutScroll has no effect under GTK because measurements are already absolute root coordinates, with the scroll offset baked in.",
    ],
    component: LayoutProjection,
    sourceCode,
};
