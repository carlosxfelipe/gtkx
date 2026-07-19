import { animated, LayoutGroup, type Transition } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { Stage } from "../../components/stage.js";
import { arenaStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./shared-element.tsx?raw";

const TABS = ["Overview", "Details", "History"];
const DEFAULT_TAB = TABS[0] ?? "Overview";

const UNDERLINE_TRANSITION: Transition = { type: "spring", stiffness: 420, damping: 34 };
const COVER_TRANSITION: Transition = { type: "spring", stiffness: 260, damping: 30 };

type TabColumnProps = {
    tab: string;
    active: boolean;
    onSelect: () => void;
};

const TabColumn = ({ tab, active, onSelect }: TabColumnProps) => (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
        <GtkButton label={tab} cssClasses={["flat"]} onClicked={onSelect} />
        <GtkBox heightRequest={4}>
            {active ? (
                <animated.GtkBox
                    layoutId="underline"
                    hexpand
                    heightRequest={4}
                    style={{ backgroundColor: "#3584e4", borderRadius: 2 }}
                    transition={UNDERLINE_TRANSITION}
                />
            ) : null}
        </GtkBox>
    </GtkBox>
);

const Tabs = ({ groupId }: { groupId: string }) => {
    const [active, setActive] = useState(DEFAULT_TAB);

    return (
        <LayoutGroup id={groupId}>
            <GtkBox spacing={4} halign={Gtk.Align.CENTER}>
                {TABS.map((tab) => (
                    <TabColumn key={tab} tab={tab} active={active === tab} onSelect={() => setActive(tab)} />
                ))}
            </GtkBox>
        </LayoutGroup>
    );
};

type CoverProps = {
    width: number;
    height: number;
    label?: string | undefined;
    onTap: () => void;
};

const Cover = ({ width, height, label, onTap }: CoverProps) => (
    <animated.GtkBox
        layoutId="cover"
        layoutCrossfade
        hexpand
        vexpand
        widthRequest={width}
        heightRequest={height}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        style={{ backgroundColor: "#9141ac", borderRadius: 18, pointerEvents: "auto" }}
        transition={COVER_TRANSITION}
        onTap={onTap}
    >
        {label === undefined ? null : <GtkLabel cssClasses={["title-3"]} hexpand vexpand label={label} />}
    </animated.GtkBox>
);

const SharedElement = () => {
    const [expanded, setExpanded] = useState(false);

    return (
        <Stage
            controls={<GtkButton label={expanded ? "Collapse" : "Expand"} onClicked={() => setExpanded(!expanded)} />}
            readout={`underline namespaced per LayoutGroup id, cover leads the ${expanded ? "hero" : "thumbnail"} node`}
        >
            <animated.GtkBox layoutRoot orientation={Gtk.Orientation.VERTICAL} spacing={20}>
                <GtkBox spacing={48} halign={Gtk.Align.CENTER}>
                    <Tabs groupId="left" />
                    <Tabs groupId="right" />
                </GtkBox>
                <GtkBox
                    cssClasses={[arenaStyle]}
                    widthRequest={420}
                    heightRequest={210}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                >
                    {expanded ? (
                        <Cover
                            key="hero"
                            width={320}
                            height={190}
                            label="Tap to collapse"
                            onTap={() => setExpanded(false)}
                        />
                    ) : (
                        <Cover key="thumb" width={110} height={72} onTap={() => setExpanded(true)} />
                    )}
                </GtkBox>
            </animated.GtkBox>
        </Stage>
    );
};

export const sharedElementScene: Scene = {
    id: "shared-element",
    section: "Layout",
    title: "Shared Elements",
    summary:
        "One layoutId carries a widget between two places in the tree, and a second layoutId is duplicated across two tab bars that stay independent because each sits in its own LayoutGroup.",
    features: ["layoutId", "LayoutGroup id", "layoutCrossfade", "layoutRoot", "pointerEvents", "distinct keys"],
    notes: [
        "Both tab bars render an underline with the layoutId underline. The LayoutGroup id namespaces the shared stack, so the underline slides within its own bar instead of flying across to the other one.",
        "The thumbnail and the hero are the same layoutId under distinct keys, so React unmounts one and mounts the other in the same commit and the projection promotes the newcomer against the outgoing snapshot.",
        'The swap is deliberately not wrapped in AnimatePresence mode="wait". Waiting would take the outgoing node out of the shared stack before the incoming one promotes, leaving nothing to animate from.',
        "layoutCrossfade fades opacity between the two nodes while their boxes converge, which hides the fact that their contents differ.",
        "layoutRoot on the outer box makes it the projection root, so both the underline and the cover are measured against a stable frame rather than the window.",
        "A non-lead layoutId node is hidden by mapping visibility hidden to zero opacity, which leaves it hit-testable. pointerEvents in style is the escape hatch: it is intercepted before CSS and forwarded to setCanTarget.",
        "Nothing counter-scales borderRadius during a projection scale, so a corner radius distorts while the box is mid-flight.",
        "A layoutId cannot animate across windows.",
    ],
    component: SharedElement,
    sourceCode,
};
