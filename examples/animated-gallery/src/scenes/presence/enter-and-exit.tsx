import {
    AnimatePresence,
    animated,
    type TargetAndTransition,
    type Transition,
    useIsPresent,
    usePresence,
} from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { useEffect, useState } from "react";
import { Stage } from "../../components/stage.js";
import type { Scene } from "../types.js";
import sourceCode from "./enter-and-exit.tsx?raw";

const INITIAL_CARDS = ["Alpha", "Beta", "Gamma"];

const HOLD_MS = 900;

const CARD_ENTER: TargetAndTransition = { opacity: 0, y: 24, scale: 0.92 };

const CARD_SETTLED: TargetAndTransition = { opacity: 1, y: 0, scale: 1 };

const CARD_EXIT: TargetAndTransition = {
    opacity: 0,
    y: -24,
    scale: 0.92,
    transition: { duration: 0.18, ease: "easeIn" },
};

const CARD_TRANSITION: Transition = { duration: 0.35, ease: "easeOut" };

const EMPTY_HIDDEN: TargetAndTransition = { opacity: 0 };

const EMPTY_SHOWN: TargetAndTransition = { opacity: 1 };

const EMPTY_EXIT: TargetAndTransition = { opacity: 0, transition: { duration: 0 } };

const EMPTY_TRANSITION: Transition = { duration: 0.2 };

const HELD_PRESENT: TargetAndTransition = { opacity: 1 };

const HELD_LEAVING: TargetAndTransition = { opacity: 0.25 };

const HELD_TRANSITION: Transition = { duration: 0.2 };

const Card = ({ id }: { id: string }) => {
    const isPresent = useIsPresent();

    return (
        <animated.GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            widthRequest={140}
            heightRequest={110}
            cssClasses={["card"]}
            initial={CARD_ENTER}
            animate={CARD_SETTLED}
            exit={CARD_EXIT}
            transition={CARD_TRANSITION}
        >
            <GtkLabel cssClasses={["title-4"]} vexpand valign={Gtk.Align.CENTER} label={id} />
            <GtkLabel cssClasses={["dim-label"]} marginBottom={10} label={isPresent ? "present" : "leaving"} />
        </animated.GtkBox>
    );
};

const EmptyState = () => (
    <animated.AdwStatusPage
        cssClasses={["compact"]}
        iconName="view-grid-symbolic"
        title="No Cards"
        description="Reset to see the enter animation"
        initial={EMPTY_HIDDEN}
        animate={EMPTY_SHOWN}
        exit={EMPTY_EXIT}
        transition={EMPTY_TRANSITION}
    />
);

const HeldCard = () => {
    const [isPresent, safeToRemove] = usePresence();

    useEffect(() => {
        if (isPresent) return;
        const timer = setTimeout(() => safeToRemove?.(), HOLD_MS);
        return () => clearTimeout(timer);
    }, [isPresent, safeToRemove]);

    return (
        <animated.GtkLabel
            cssClasses={["title-4"]}
            label={`held ${HOLD_MS} ms`}
            animate={isPresent ? HELD_PRESENT : HELD_LEAVING}
            transition={HELD_TRANSITION}
        />
    );
};

type ControlsProps = {
    count: number;
    onRemove: () => void;
    onReset: () => void;
    onToggleHeld: () => void;
};

const Controls = ({ count, onRemove, onReset, onToggleHeld }: ControlsProps) => (
    <>
        <GtkButton label="Remove" sensitive={count > 0} onClicked={onRemove} />
        <GtkButton label="Reset" onClicked={onReset} />
        <GtkButton label="Toggle held card" onClicked={onToggleHeld} />
    </>
);

const EnterAndExit = () => {
    const [cards, setCards] = useState(INITIAL_CARDS);
    const [showHeld, setShowHeld] = useState(true);
    const [exits, setExits] = useState(0);

    return (
        <Stage
            controls={
                <Controls
                    count={cards.length}
                    onRemove={() => setCards((current) => current.slice(0, -1))}
                    onReset={() => setCards(INITIAL_CARDS)}
                    onToggleHeld={() => setShowHeld((value) => !value)}
                />
            }
            readout={`onExitComplete: ${exits}`}
        >
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={16} halign={Gtk.Align.CENTER}>
                <GtkBox spacing={12} heightRequest={130}>
                    <AnimatePresence onExitComplete={() => setExits((count) => count + 1)}>
                        {cards.map((id) => (
                            <Card key={id} id={id} />
                        ))}
                    </AnimatePresence>
                </GtkBox>
                <AnimatePresence initial={false}>
                    {cards.length === 0 ? <EmptyState key="empty" /> : null}
                </AnimatePresence>
                <AnimatePresence>{showHeld ? <HeldCard key="held" /> : null}</AnimatePresence>
            </GtkBox>
        </Stage>
    );
};

export const enterAndExitScene: Scene = {
    id: "enter-and-exit",
    section: "Presence",
    title: "Enter and Exit",
    summary: "Animate widgets as they mount and unmount, and hold a child back until you release it.",
    features: [
        "AnimatePresence",
        "exit",
        "exit.transition",
        "onExitComplete",
        "initial={false}",
        "useIsPresent",
        "usePresence",
        "animated.AdwStatusPage",
    ],
    notes: [
        "A child needs a stable semantic key so AnimatePresence can tell a removal from a reorder.",
        "A transition nested inside exit overrides the shared transition for the leaving state only.",
        'The empty state keys on "empty" and not on its text, so a new message is a prop update, not a remount.',
        "The asymmetry is deliberate: populated to empty fades, empty to populated cuts, via the zero duration exit.",
        "useIsPresent reports whether a widget is leaving; usePresence adds safeToRemove so you can hold it yourself.",
    ],
    component: EnterAndExit,
    sourceCode,
};
