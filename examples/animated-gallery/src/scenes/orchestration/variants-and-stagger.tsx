import { animated, stagger, useCycle, type Variants } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { EventLog } from "../../components/event-log.js";
import { Slider } from "../../components/slider.js";
import { Stage } from "../../components/stage.js";
import { useEventLog } from "../../hooks/use-event-log.js";
import { chipStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./variants-and-stagger.tsx?raw";

const TILES = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];

const HIDDEN = "hidden";
const SHOWN = "shown";
const LIFTED = "lifted";

const INITIAL_STAGGER = 0.08;

const tileVariants: Variants = {
    hidden: (index: number) => ({ opacity: 0, x: -24 - index * 12, scale: 0.94 }),
    shown: (index: number) => ({
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { type: "spring", stiffness: 320, damping: 24, delay: index * 0.01 },
    }),
    lifted: { scale: 1.06 },
};

const forwardVariants = (amount: number): Variants => ({
    hidden: { opacity: 0 },
    shown: { opacity: 1, transition: { when: "beforeChildren", delayChildren: stagger(amount) } },
});

const reverseVariants = (amount: number): Variants => ({
    hidden: { opacity: 0 },
    shown: { opacity: 1, transition: { staggerChildren: amount, staggerDirection: -1 } },
});

const centerVariants = (amount: number): Variants => ({
    hidden: { opacity: 0 },
    shown: { opacity: 1, transition: { delayChildren: stagger(amount, { from: "center" }) } },
});

type TileColumnProps = {
    variants: Variants;
    state: string;
    title: string;
    onSettled: (title: string) => void;
};

const TileColumn = ({ variants, state, title, onSettled }: TileColumnProps) => (
    <animated.GtkBox
        orientation={Gtk.Orientation.VERTICAL}
        spacing={8}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.START}
        variants={variants}
        initial={HIDDEN}
        animate={state}
        whileHover={LIFTED}
        onAnimationComplete={() => onSettled(title)}
    >
        <GtkLabel cssClasses={["heading", "dim-label"]} label={title} />
        {TILES.map((label, index) => (
            <animated.GtkLabel
                key={label}
                cssClasses={["card", chipStyle]}
                widthRequest={132}
                heightRequest={34}
                label={label}
                custom={index}
                variants={tileVariants}
            />
        ))}
    </animated.GtkBox>
);

const VariantsAndStagger = () => {
    const [state, cycle] = useCycle(HIDDEN, SHOWN);
    const [amount, setAmount] = useState(INITIAL_STAGGER);
    const { entries, log } = useEventLog();

    const handleSettled = (title: string) => log(`${title}: ${state}`);

    return (
        <Stage
            aside={<EventLog entries={entries} />}
            controls={
                <>
                    <GtkButton label="Cycle" cssClasses={["pill", "suggested-action"]} onClicked={() => cycle()} />
                    <Slider
                        label="stagger"
                        initialValue={INITIAL_STAGGER}
                        lower={0.02}
                        upper={0.3}
                        step={0.01}
                        digits={2}
                        onChange={setAmount}
                    />
                </>
            }
            readout={`state: ${state}, stagger: ${amount.toFixed(2)}s`}
        >
            <GtkBox spacing={28} valign={Gtk.Align.START}>
                <TileColumn
                    variants={forwardVariants(amount)}
                    state={state}
                    title="stagger()"
                    onSettled={handleSettled}
                />
                <TileColumn
                    variants={reverseVariants(amount)}
                    state={state}
                    title="direction -1"
                    onSettled={handleSettled}
                />
                <TileColumn
                    variants={centerVariants(amount)}
                    state={state}
                    title="from center"
                    onSettled={handleSettled}
                />
            </GtkBox>
        </Stage>
    );
};

export const variantsAndStaggerScene: Scene = {
    id: "variants-and-stagger",
    section: "Orchestration",
    title: "Variants and Stagger",
    summary: "One variant name drives a whole subtree, and stagger spreads the children of that subtree out in time.",
    features: [
        "variants",
        "initial and animate as variant names",
        "inherited child variants",
        "delayChildren with stagger()",
        "staggerChildren",
        "staggerDirection",
        "when: beforeChildren",
        "dynamic variants with custom",
        "whileHover propagating a variant",
        "useCycle",
    ],
    notes: [
        "A child that declares variants inherits the parent's variant name, so the tiles carry no initial or animate prop of their own.",
        "Gesture variants propagate the same way: hovering a column resolves lifted on every tile inside it.",
        "A variant may be a function of custom, which expresses per-index offsets and delays without writing a variant per child.",
        "The first column schedules its children with delayChildren: stagger(), and when: beforeChildren holds the children back until the column itself has finished fading in.",
        "The second column uses the plain numeric form, staggerChildren with staggerDirection -1, so the last tile leads. Whenever delayChildren is a stagger function it computes the entire child schedule and those two options step aside.",
        "The third column passes from: center to stagger(), so the middle tile leads and the ends follow.",
        "Moving the slider takes effect on the next cycle: variant changes are diffed on resolved values, and a transition is not one of them.",
    ],
    component: VariantsAndStagger,
    sourceCode,
};
