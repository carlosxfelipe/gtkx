import { animated, type TargetAndTransition, type Transition } from "@gtkx/animated";
import { DropDown } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkCheckButton } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { Slider } from "../../components/slider.js";
import { Stage } from "../../components/stage.js";
import { arenaStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./transforms.tsx?raw";

type TransformEntry = {
    id: string;
    label: string;
    target: (amount: number) => TargetAndTransition;
};

const PERSPECTIVE = 600;

const BASE: TargetAndTransition = {
    transformPerspective: PERSPECTIVE,
    x: 0,
    y: 0,
    z: 0,
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    skewX: 0,
    skewY: 0,
};

const DEFAULT_TRANSFORM: TransformEntry = {
    id: "x",
    label: "x",
    target: (amount) => ({ ...BASE, x: amount }),
};

const TRANSFORMS: TransformEntry[] = [
    DEFAULT_TRANSFORM,
    { id: "y", label: "y", target: (amount) => ({ ...BASE, y: amount }) },
    { id: "z", label: "z", target: (amount) => ({ ...BASE, z: amount }) },
    {
        id: "translate",
        label: "translateX / Y / Z",
        target: (amount) => ({ ...BASE, translateX: amount, translateY: amount / 3, translateZ: amount }),
    },
    { id: "scale", label: "scale", target: (amount) => ({ ...BASE, scale: 1 + amount / 220 }) },
    {
        id: "scale-xy",
        label: "scaleX / scaleY",
        target: (amount) => ({ ...BASE, scaleX: 1 + amount / 200, scaleY: 1 - amount / 400 }),
    },
    { id: "rotate", label: "rotate", target: (amount) => ({ ...BASE, rotate: amount }) },
    { id: "rotate-x", label: "rotateX", target: (amount) => ({ ...BASE, rotateX: amount }) },
    { id: "rotate-y", label: "rotateY", target: (amount) => ({ ...BASE, rotateY: amount }) },
    { id: "rotate-z", label: "rotateZ", target: (amount) => ({ ...BASE, rotateZ: amount }) },
    {
        id: "skew",
        label: "skewX / skewY",
        target: (amount) => ({ ...BASE, skewX: amount / 8, skewY: amount / 16 }),
    },
];

const DEFAULT_ORIGIN = "50% 50%";

const ORIGINS: string[] = [DEFAULT_ORIGIN, "0% 0%", "100% 0%", "0% 100%", "100% 100%"];

const TRANSITION: Transition = { type: "spring", stiffness: 280, damping: 24 };

const TEMPLATE_OFFSET = "translateY(-32px)";

type ControlsProps = {
    selectedId: string;
    origin: string;
    offset: boolean;
    onSelect: (id: string) => void;
    onOrigin: (origin: string) => void;
    onAmount: (amount: number) => void;
    onOffset: (offset: boolean) => void;
};

const TransformControls = ({ selectedId, origin, offset, onSelect, onOrigin, onAmount, onOffset }: ControlsProps) => (
    <>
        <DropDown
            widthRequest={200}
            items={TRANSFORMS.map((entry) => ({ id: entry.id, value: entry.label }))}
            selectedId={selectedId}
            onSelectionChanged={onSelect}
        />
        <DropDown
            widthRequest={150}
            items={ORIGINS.map((value) => ({ id: value, value }))}
            selectedId={origin}
            onSelectionChanged={onOrigin}
        />
        <Slider label="Amount" initialValue={0} lower={-120} upper={120} step={1} onChange={onAmount} />
        <GtkCheckButton
            label="transformTemplate offset"
            active={offset}
            onToggled={(button: Gtk.CheckButton) => onOffset(button.getActive())}
        />
    </>
);

const Transforms = () => {
    const [selectedId, setSelectedId] = useState(DEFAULT_TRANSFORM.id);
    const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
    const [amount, setAmount] = useState(0);
    const [offset, setOffset] = useState(false);
    const entry = TRANSFORMS.find((candidate) => candidate.id === selectedId) ?? DEFAULT_TRANSFORM;

    return (
        <Stage
            controls={
                <TransformControls
                    selectedId={selectedId}
                    origin={origin}
                    offset={offset}
                    onSelect={setSelectedId}
                    onOrigin={setOrigin}
                    onAmount={setAmount}
                    onOffset={setOffset}
                />
            }
            readout={`${entry.label} at ${Math.round(amount)}, origin ${origin}, perspective ${PERSPECTIVE}px`}
        >
            <GtkBox cssClasses={[arenaStyle]} widthRequest={420} heightRequest={260}>
                <animated.GtkBox
                    hexpand
                    vexpand
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                    widthRequest={130}
                    heightRequest={130}
                    style={{ backgroundColor: "#3584e4", borderRadius: 14, transformOrigin: origin }}
                    animate={entry.target(amount)}
                    transformTemplate={(_latest, generated) => (offset ? `${generated} ${TEMPLATE_OFFSET}` : generated)}
                    transition={TRANSITION}
                />
            </GtkBox>
        </Stage>
    );
};

export const transformsScene: Scene = {
    id: "transforms",
    section: "Values",
    title: "Transforms",
    summary: "Every transform key motion knows about, folded into one GTK transform declaration.",
    features: [
        "x",
        "y",
        "z",
        "translateX",
        "translateY",
        "translateZ",
        "scale",
        "scaleX",
        "scaleY",
        "rotate",
        "rotateX",
        "rotateY",
        "rotateZ",
        "skewX",
        "skewY",
        "transformPerspective",
        "transformOrigin",
        "transformTemplate",
    ],
    notes: [
        "Transforms are delivered as GTK CSS text on a generated class, never as a widget allocation transform, so the widget keeps its original allocation and siblings never reflow.",
        "Use skewX and skewY. motion emits a single argument skew(), GTK requires two, and the parse failure discards the whole transform declaration for that frame, taking x, y, scale and rotate down with it.",
        "transformOrigin carries two components. GTK rejects the three component form, so the registry truncates it before serialization.",
        "transformPerspective stays pinned so rotateX, rotateY, z and translateZ read as depth rather than a flat squash.",
        "Every entry names a value for every transform key, so switching demonstrations springs the unused keys back to rest instead of stranding them.",
        "transformTemplate receives the generated transform string and returns the one that reaches CSS, which is how the offset checkbox stacks an extra translate on top.",
    ],
    component: Transforms,
    sourceCode,
};
