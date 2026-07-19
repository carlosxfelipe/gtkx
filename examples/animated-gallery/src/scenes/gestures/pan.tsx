import { animate, animated, type MotionValue, useMotionValue, useTransform } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { useState } from "react";
import { EventLog } from "../../components/event-log.js";
import { Slider } from "../../components/slider.js";
import { Stage } from "../../components/stage.js";
import { useEventLog } from "../../hooks/use-event-log.js";
import { chipStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./pan.tsx?raw";

type Phase = "idle" | "session" | "panning";

type Offsets = {
    offsetX: MotionValue<number>;
    offsetY: MotionValue<number>;
};

type PanValues = Offsets & {
    follow: MotionValue<number>;
};

const IDLE_BACKGROUND = "rgba(120, 122, 134, 0.14)";
const ACTIVE_BACKGROUND = "rgba(53, 132, 228, 0.32)";
const ARENA_IDLE = { backgroundColor: IDLE_BACKGROUND };
const ARENA_ACTIVE = { backgroundColor: ACTIVE_BACKGROUND };

const phaseInfo = (phase: Phase): { label: string; callback: string } => {
    if (phase === "session") return { label: "session", callback: "onPanSessionStart" };
    if (phase === "panning") return { label: "panning", callback: "onPanStart" };
    return { label: "idle", callback: "onPanEnd" };
};

const releaseToOrigin = (value: MotionValue<number>) =>
    animate(value, 0, { type: "spring", stiffness: 320, damping: 30 });

const useScaled = (source: MotionValue<number>, factor: MotionValue<number>) =>
    useTransform([source, factor], ([offset = 0, strength = 0]: number[]) => offset * strength);

const Marker = ({ offsetX, offsetY, follow }: PanValues) => {
    const x = useScaled(offsetX, follow);
    const y = useScaled(offsetY, follow);

    return (
        <animated.GtkImage
            name="pan-marker"
            iconName="input-touchpad-symbolic"
            pixelSize={64}
            hexpand
            vexpand
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            style={{ x, y }}
        />
    );
};

const LiveOffset = ({ offsetX, offsetY }: Offsets) => {
    const text = useTransform(
        [offsetX, offsetY],
        ([dx = 0, dy = 0]: number[]) => `offset ${Math.round(dx)}, ${Math.round(dy)}`,
    );

    return (
        <animated.GtkLabel name="pan-offset" cssClasses={[chipStyle]} halign={Gtk.Align.CENTER} marginBottom={14}>
            {text}
        </animated.GtkLabel>
    );
};

type ArenaProps = {
    phase: Phase;
    values: PanValues;
    onPhase: (phase: Phase, detail: string) => void;
};

const PanArena = ({ phase, values, onPhase }: ArenaProps) => (
    <animated.GtkBox
        name="pan-arena"
        orientation={Gtk.Orientation.VERTICAL}
        widthRequest={420}
        heightRequest={260}
        style={{ backgroundColor: IDLE_BACKGROUND, borderRadius: 16 }}
        animate={phase === "panning" ? ARENA_ACTIVE : ARENA_IDLE}
        transition={{ duration: 0.25 }}
        onPanSessionStart={() => onPhase("session", "press registered, waiting for movement")}
        onPanStart={() => onPhase("panning", "tracking the pointer")}
        onPan={(_event, info) => {
            values.offsetX.set(info.offset.x);
            values.offsetY.set(info.offset.y);
        }}
        onPanEnd={(_event, info) => {
            releaseToOrigin(values.offsetX);
            releaseToOrigin(values.offsetY);
            onPhase("idle", `velocity ${Math.round(info.velocity.x)}, ${Math.round(info.velocity.y)} px/s`);
        }}
    >
        <Marker offsetX={values.offsetX} offsetY={values.offsetY} follow={values.follow} />
        <LiveOffset offsetX={values.offsetX} offsetY={values.offsetY} />
    </animated.GtkBox>
);

const Pan = () => {
    const offsetX = useMotionValue(0);
    const offsetY = useMotionValue(0);
    const follow = useMotionValue(0.4);
    const [phase, setPhase] = useState<Phase>("idle");
    const [detail, setDetail] = useState("no pan yet");
    const { entries, log } = useEventLog();

    const handlePhase = (next: Phase, summary: string) => {
        setPhase(next);
        setDetail(summary);
        log(phaseInfo(next).callback);
    };

    return (
        <Stage
            readout={`${phaseInfo(phase).label} - ${detail}`}
            aside={<EventLog entries={entries} />}
            controls={
                <Slider
                    label="Follow"
                    initialValue={0.4}
                    lower={0}
                    upper={1}
                    step={0.05}
                    digits={2}
                    onChange={(value) => follow.set(value)}
                />
            }
        >
            <PanArena phase={phase} values={{ offsetX, offsetY, follow }} onPhase={handlePhase} />
        </Stage>
    );
};

export const panScene: Scene = {
    id: "pan",
    section: "Gestures",
    title: "Pan",
    summary: "Track a pointer drag through the pan callbacks and write every frame into motion values.",
    features: ["onPanSessionStart", "onPanStart", "onPan", "onPanEnd", "PanInfo", "useMotionValue", "useTransform"],
    notes: [
        "Pan runs its own Gtk.GestureDrag in the bubble phase, unlike drag, which uses the capture phase, so a child that consumes the press stops the pan from starting.",
        "onPanSessionStart fires on press. onPanStart only follows once the pointer has moved three pixels, so a plain click leaves the readout in the session state.",
        "Velocity in PanInfo is sampled manually over a hundred millisecond window.",
        "The marker and the live offset label read the motion values directly, so no React render happens on the gesture path.",
        "Passing a MotionValue as the children of an animated label writes straight to the label property, which keeps per-frame text off the render path.",
    ],
    component: Pan,
    sourceCode,
};
