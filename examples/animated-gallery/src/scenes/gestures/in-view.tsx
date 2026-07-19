import { animated } from "@gtkx/animated";
import { DropDown } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkCheckButton, GtkLabel, GtkScrolledWindow } from "@gtkx/jsx/gtk";
import { type RefObject, useRef, useState } from "react";
import { EventLog } from "../../components/event-log.js";
import { Slider } from "../../components/slider.js";
import { Stage } from "../../components/stage.js";
import { useEventLog } from "../../hooks/use-event-log.js";
import { arenaStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./in-view.tsx?raw";

type ViewportAmount = "some" | "all" | number;

type ViewportSettings = {
    once: boolean;
    amount: ViewportAmount;
    margin: string;
    root?: RefObject<Gtk.Box | null> | undefined;
};

type AmountChoice = {
    id: string;
    label: string;
    value: ViewportAmount;
};

const ROWS = ["First", "Second", "Third", "Fourth"];

const AMOUNTS: AmountChoice[] = [
    { id: "some", label: "some", value: "some" },
    { id: "half", label: "0.5", value: 0.5 },
    { id: "all", label: "all", value: "all" },
];

const DEFAULT_AMOUNT: AmountChoice = { id: "some", label: "some", value: "some" };

const AMOUNT_ITEMS = AMOUNTS.map((choice) => ({ id: choice.id, value: choice.label }));

const HIDDEN = { opacity: 0.15, y: 32, scale: 0.96 };

const REVEALED = { opacity: 1, y: 0, scale: 1 };

type ToggleProps = {
    label: string;
    active: boolean;
    onChange: (value: boolean) => void;
};

const Toggle = ({ label, active, onChange }: ToggleProps) => (
    <GtkCheckButton label={label} active={active} onToggled={(self: Gtk.CheckButton) => onChange(self.getActive())} />
);

type ControlsProps = {
    once: boolean;
    rooted: boolean;
    amountId: string;
    onOnce: (value: boolean) => void;
    onRooted: (value: boolean) => void;
    onAmount: (id: string) => void;
    onMargin: (value: number) => void;
};

const InViewControls = ({ once, rooted, amountId, onOnce, onRooted, onAmount, onMargin }: ControlsProps) => (
    <>
        <Toggle label="once" active={once} onChange={onOnce} />
        <Toggle label="explicit root" active={rooted} onChange={onRooted} />
        <DropDown widthRequest={120} items={AMOUNT_ITEMS} selectedId={amountId} onSelectionChanged={onAmount} />
        <Slider label="margin px" initialValue={0} lower={-120} upper={120} step={10} onChange={onMargin} />
    </>
);

type RevealRowProps = {
    label: string;
    viewport: ViewportSettings;
    onEnter: (ratio: number) => void;
    onLeave: () => void;
};

const RevealRow = ({ label, viewport, onEnter, onLeave }: RevealRowProps) => (
    <animated.GtkBox
        heightRequest={96}
        cssClasses={["card"]}
        initial={HIDDEN}
        whileInView={REVEALED}
        viewport={viewport}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onViewportEnter={(entry) => onEnter(entry?.intersectionRatio ?? 0)}
        onViewportLeave={onLeave}
    >
        <GtkLabel cssClasses={["title-4"]} hexpand vexpand label={label} />
    </animated.GtkBox>
);

type RevealTrackProps = {
    viewport: ViewportSettings;
    revision: string;
    onEnter: (label: string, ratio: number) => void;
    onLeave: (label: string) => void;
};

const RevealTrack = ({ viewport, revision, onEnter, onLeave }: RevealTrackProps) => (
    <GtkScrolledWindow
        heightRequest={260}
        widthRequest={420}
        marginTop={20}
        marginBottom={20}
        marginStart={20}
        marginEnd={20}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        hasFrame
    >
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24} marginEnd={12}>
            <GtkBox heightRequest={200} />
            {ROWS.map((row) => (
                <RevealRow
                    key={`${row}-${revision}`}
                    label={row}
                    viewport={viewport}
                    onEnter={(ratio) => onEnter(row, ratio)}
                    onLeave={() => onLeave(row)}
                />
            ))}
            <GtkBox heightRequest={200} />
        </GtkBox>
    </GtkScrolledWindow>
);

const InView = () => {
    const rootRef = useRef<Gtk.Box>(null);
    const { entries, log } = useEventLog();
    const [once, setOnce] = useState(false);
    const [rooted, setRooted] = useState(false);
    const [amountId, setAmountId] = useState("some");
    const [margin, setMargin] = useState(0);
    const choice = AMOUNTS.find((item) => item.id === amountId) ?? DEFAULT_AMOUNT;
    const viewport: ViewportSettings = {
        once,
        amount: choice.value,
        margin: `${margin}`,
        ...(rooted ? { root: rootRef } : {}),
    };
    const rootLabel = rooted ? "wrapper box" : "nearest scrolled window";

    return (
        <Stage
            aside={<EventLog entries={entries} />}
            readout={`root ${rootLabel}, amount ${choice.label}, margin ${margin}px, once ${once}`}
            controls={
                <InViewControls
                    once={once}
                    rooted={rooted}
                    amountId={amountId}
                    onOnce={setOnce}
                    onRooted={setRooted}
                    onAmount={setAmountId}
                    onMargin={setMargin}
                />
            }
        >
            <GtkBox orientation={Gtk.Orientation.VERTICAL} ref={rootRef} cssClasses={[arenaStyle]}>
                <RevealTrack
                    viewport={viewport}
                    revision={`${once}-${rooted}-${amountId}-${margin}`}
                    onEnter={(label, ratio) => log(`enter ${label} at ${ratio.toFixed(2)}`)}
                    onLeave={(label) => log(`leave ${label}`)}
                />
            </GtkBox>
        </Stage>
    );
};

export const inViewScene: Scene = {
    id: "in-view",
    section: "Gestures",
    title: "In View",
    summary: "Reveal rows as they scroll into a viewport, with once, amount, margin, and an explicit root.",
    features: [
        "whileInView",
        "onViewportEnter",
        "onViewportLeave",
        "viewport.once",
        "viewport.amount",
        "viewport.margin",
        "viewport.root",
    ],
    notes: [
        "The viewport is viewport.root when you name one, otherwise the nearest ancestor scrolled window, otherwise the toplevel window.",
        "Visibility is measured geometrically and re-checked on map, unmap, and the scroll adjustments of every ancestor scrolled window, so a plain container resize does not re-check.",
        "viewport.margin is parsed number by number, so it is unitless pixels: -80 works and 10% is read as ten pixels.",
        "Explicit root points at the wrapper box, which is inset 20px around the scrolled window, so rows reveal slightly before they scroll into sight.",
        "Changing a control remounts the rows so the new viewport options are measured immediately, which also clears a spent once.",
    ],
    component: InView,
    sourceCode,
};
