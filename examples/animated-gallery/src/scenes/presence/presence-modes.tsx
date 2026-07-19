import { AnimatePresence, animated, type Variants } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkButton, GtkCheckButton, GtkLabel } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { EventLog } from "../../components/event-log.js";
import { Stage } from "../../components/stage.js";
import { useEventLog } from "../../hooks/use-event-log.js";
import { chipStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./presence-modes.tsx?raw";

const PAGES = ["One", "Two", "Three"];
const DEFAULT_PAGE = PAGES[0] ?? "One";

const slide: Variants = {
    enter: (direction: number) => ({ opacity: 0, x: direction * 90 }),
    center: { opacity: 1, x: 0 },
    leave: (direction: number) => ({ opacity: 0, x: direction * -90 }),
};

type PageProps = {
    label: string;
    direction: number;
};

const Page = ({ label, direction }: PageProps) => (
    <animated.GtkBox
        orientation={Gtk.Orientation.VERTICAL}
        spacing={10}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        custom={direction}
        variants={slide}
        initial="enter"
        animate="center"
        exit="leave"
        transition={{ duration: 0.35, ease: "easeInOut" }}
    >
        <GtkLabel cssClasses={["title-1"]} label={label} />
        <AnimatePresence propagate>
            <animated.GtkLabel
                key={`${label}-badge`}
                cssClasses={["dim-label", chipStyle]}
                label="nested, propagate"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
            />
        </AnimatePresence>
    </animated.GtkBox>
);

type ControlsProps = {
    wait: boolean;
    onGo: (delta: number) => void;
    onWaitChange: (wait: boolean) => void;
};

const Controls = ({ wait, onGo, onWaitChange }: ControlsProps) => (
    <>
        <GtkButton label="Previous" onClicked={() => onGo(-1)} />
        <GtkButton label="Next" onClicked={() => onGo(1)} />
        <GtkCheckButton
            label='mode="wait"'
            active={wait}
            onToggled={(button: Gtk.CheckButton) => onWaitChange(button.getActive())}
        />
    </>
);

const PresenceModes = () => {
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const [wait, setWait] = useState(true);
    const { entries, log } = useEventLog();
    const label = PAGES[index] ?? DEFAULT_PAGE;

    const go = (delta: number) => {
        setDirection(delta);
        setIndex((current) => (current + delta + PAGES.length) % PAGES.length);
    };

    return (
        <Stage
            controls={<Controls wait={wait} onGo={go} onWaitChange={setWait} />}
            aside={<EventLog entries={entries} />}
            readout={wait ? "wait: every exit finishes first" : "sync: enter and exit overlap"}
        >
            <AnimatePresence
                initial={false}
                mode={wait ? "wait" : "sync"}
                custom={direction}
                onExitComplete={() => log(`exit complete, mode ${wait ? "wait" : "sync"}`)}
            >
                <Page key={label} label={label} direction={direction} />
            </AnimatePresence>
        </Stage>
    );
};

export const presenceModesScene: Scene = {
    id: "presence-modes",
    section: "Presence",
    title: "Sync, Wait and Custom",
    summary:
        "Page swaps driven by AnimatePresence, with the travel direction passed through custom so the same variants resolve to a different target on each side.",
    features: ['mode="sync"', 'mode="wait"', "initial={false}", "custom", "dynamic variants", "propagate"],
    notes: [
        'mode="wait" holds the incoming page until the outgoing one has finished its exit, so the stage is empty for a beat. mode="sync" overlaps them.',
        "custom is read by the presence and by the child, so an exiting page still resolves its leave variant against the newest direction.",
        "Variant functions receive that custom value, which is how enter and leave flip their sign without duplicating the variant set.",
        "initial={false} suppresses the enter animation for the page that is present on the first render.",
        "propagate on the nested presence lets the badge run its own exit when the parent page leaves.",
        'mode="popLayout" is a no-op under GTK because the pop path expects an HTML element, so exiting children keep their layout slot. Use sync or wait.',
    ],
    component: PresenceModes,
    sourceCode,
};
