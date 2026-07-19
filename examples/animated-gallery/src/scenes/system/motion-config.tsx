import {
    animated,
    MotionConfig,
    type ReducedMotionConfig,
    type TargetAndTransition,
    type Transition,
    useReducedMotion,
    useReducedMotionConfig,
} from "@gtkx/animated";
import { DropDown } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkLabel } from "@gtkx/jsx/gtk";
import { useProperty } from "@gtkx/react";
import { type ReactNode, useState } from "react";
import { Stage } from "../../components/stage.js";
import { chipStyle, monoStyle, trackStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./motion-config.tsx?raw";

const DEFAULT_MODE: ReducedMotionConfig = "user";

const MODE_ITEMS: { id: ReducedMotionConfig; value: string }[] = [
    { id: "user", value: '"user"' },
    { id: "always", value: '"always"' },
    { id: "never", value: '"never"' },
];

const SUBTREE_TRANSITION: Transition = {
    duration: 2,
    ease: "easeInOut",
    repeat: Number.POSITIVE_INFINITY,
    repeatType: "loop",
};

const OWN_TRANSITION: Transition = {
    duration: 0.6,
    ease: "linear",
    repeat: Number.POSITIVE_INFINITY,
    repeatType: "reverse",
};

const TRAVEL: TargetAndTransition = { x: [0, 200, 0] };
const PULSE: TargetAndTransition = { opacity: [1, 0.15, 1] };
const SHIFT: TargetAndTransition = { backgroundColor: ["#9141ac", "#2ec27e", "#9141ac"] };

const toMode = (id: string): ReducedMotionConfig => MODE_ITEMS.find((item) => item.id === id)?.id ?? DEFAULT_MODE;

const describePreference = (value: Gtk.ReducedMotion | undefined): string => {
    if (value === undefined) return "unavailable";
    return value === Gtk.ReducedMotion.REDUCE ? "reduce" : "no-preference";
};

const useSystemReadout = (): string => {
    const settings = Gtk.Settings.getDefault();
    const enableAnimations = useProperty(settings, "gtkEnableAnimations");
    const preference = useProperty(settings, "gtkInterfaceReducedMotion");
    const prefersReduced = useReducedMotion();

    return [
        `useReducedMotion(): ${String(prefersReduced)}`,
        `gtk-interface-reduced-motion: ${describePreference(preference)}`,
        `gtk-enable-animations: ${String(enableAnimations ?? "unavailable")}`,
    ].join("   ");
};

const Row = ({ caption, children }: { caption: string; children: ReactNode }) => (
    <GtkBox spacing={12}>
        <GtkLabel cssClasses={["dim-label", monoStyle]} widthRequest={210} xalign={0} label={caption} />
        <GtkBox cssClasses={[trackStyle]} widthRequest={250} valign={Gtk.Align.CENTER}>
            {children}
        </GtkBox>
    </GtkBox>
);

const Dot = ({ color, animate }: { color: string; animate: TargetAndTransition }) => (
    <animated.GtkBox
        widthRequest={28}
        heightRequest={28}
        marginTop={8}
        marginBottom={8}
        marginStart={8}
        style={{ backgroundColor: color, borderRadius: 14 }}
        animate={animate}
    />
);

const Subtree = () => {
    const resolved = useReducedMotionConfig();

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={14}>
            <Row caption="x, inherited timing">
                <Dot color="#3584e4" animate={TRAVEL} />
            </Row>
            <Row caption="opacity, inherited timing">
                <Dot color="#e66100" animate={PULSE} />
            </Row>
            <Row caption="backgroundColor, own timing">
                <animated.GtkBox
                    widthRequest={36}
                    heightRequest={36}
                    marginTop={4}
                    marginBottom={4}
                    marginStart={4}
                    style={{ backgroundColor: "#9141ac", borderRadius: 6 }}
                    animate={SHIFT}
                    transition={OWN_TRANSITION}
                />
            </Row>
            <GtkLabel
                cssClasses={[chipStyle]}
                halign={Gtk.Align.CENTER}
                label={`useReducedMotionConfig(): ${String(resolved)}`}
            />
        </GtkBox>
    );
};

const MotionConfigScene = () => {
    const [mode, setMode] = useState<ReducedMotionConfig>(DEFAULT_MODE);
    const readout = useSystemReadout();

    return (
        <Stage
            controls={
                <DropDown
                    widthRequest={180}
                    items={MODE_ITEMS}
                    selectedId={mode}
                    onSelectionChanged={(id) => setMode(toMode(id))}
                />
            }
            readout={readout}
        >
            <MotionConfig reducedMotion={mode} transition={SUBTREE_TRANSITION}>
                <Subtree key={mode} />
            </MotionConfig>
        </Stage>
    );
};

export const motionConfigScene: Scene = {
    id: "motion-config",
    section: "System",
    title: "Motion Config",
    summary:
        "A default transition and a reduced-motion policy handed to a whole subtree through MotionConfig, alongside the GTK settings that feed motion's reduced-motion preference.",
    features: [
        "MotionConfig",
        "transition default",
        "reducedMotion",
        "useReducedMotion",
        "useReducedMotionConfig",
        "gtk-interface-reduced-motion",
        "gtk-enable-animations",
    ],
    notes: [
        "MotionConfig hands a transition to everything below it. The first two rows carry no transition of their own and run on that two second loop, while the third names its own and keeps its faster rhythm.",
        'reducedMotion swaps size, position and transform animations for instant ones, so under "always" the x row settles on its final keyframe while the opacity and backgroundColor rows keep running.',
        "A widget resolves the reduced-motion policy when its visual element mounts, so the subtree is keyed on the selected mode to pick up a change.",
        "gtk-interface-reduced-motion is what motion reads as the system preference, and gtk-enable-animations makes every animation in the app complete instantly while it is off, which MotionConfig leaves alone.",
        "useReducedMotion reports the system preference captured at mount. useReducedMotionConfig resolves that preference against the nearest MotionConfig, which is why the chip inside the subtree follows the dropdown.",
    ],
    component: MotionConfigScene,
    sourceCode,
};
