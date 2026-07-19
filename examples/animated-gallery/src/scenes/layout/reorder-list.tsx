import {
    AnimatePresence,
    animated,
    LayoutGroup,
    moveItem,
    type TargetAndTransition,
    type Transition,
} from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { Stage } from "../../components/stage.js";
import type { Scene } from "../types.js";
import sourceCode from "./reorder-list.tsx?raw";

type Row = { id: string; label: string };

const INITIAL_ROWS: Row[] = [
    { id: "a", label: "Draft the proposal" },
    { id: "b", label: "Review the design" },
    { id: "c", label: "Ship the release" },
    { id: "d", label: "Write the changelog" },
];

const EXTRA_LABELS = ["Book the venue", "Send the invites", "Pack the boxes"];

const FALLBACK_LABEL = "Another task";

const MAX_ROWS = 5;

const ROW_ENTER: TargetAndTransition = { opacity: 0, x: -32 };

const ROW_SETTLED: TargetAndTransition = { opacity: 1, x: 0 };

const ROW_EXIT: TargetAndTransition = { opacity: 0, x: 32, transition: { duration: 0.16 } };

const ROW_TRANSITION: Transition = { type: "spring", stiffness: 420, damping: 34 };

type ReorderRowProps = {
    row: Row;
    index: number;
    count: number;
    onMove: (from: number, to: number) => void;
    onRemove: (id: string) => void;
};

const ReorderRow = ({ row, index, count, onMove, onRemove }: ReorderRowProps) => (
    <animated.GtkBox
        layout
        layoutDependency={index}
        widthRequest={380}
        heightRequest={56}
        spacing={6}
        cssClasses={["card"]}
        initial={ROW_ENTER}
        animate={ROW_SETTLED}
        exit={ROW_EXIT}
        transition={ROW_TRANSITION}
    >
        <GtkLabel hexpand xalign={0} marginStart={12} label={row.label} />
        <GtkButton
            iconName="go-up-symbolic"
            cssClasses={["flat"]}
            valign={Gtk.Align.CENTER}
            sensitive={index > 0}
            onClicked={() => onMove(index, index - 1)}
        />
        <GtkButton
            iconName="go-down-symbolic"
            cssClasses={["flat"]}
            valign={Gtk.Align.CENTER}
            sensitive={index < count - 1}
            onClicked={() => onMove(index, index + 1)}
        />
        <GtkButton
            iconName="user-trash-symbolic"
            cssClasses={["flat"]}
            valign={Gtk.Align.CENTER}
            marginEnd={8}
            onClicked={() => onRemove(row.id)}
        />
    </animated.GtkBox>
);

type ControlsProps = {
    canAdd: boolean;
    onAdd: () => void;
    onReset: () => void;
};

const Controls = ({ canAdd, onAdd, onReset }: ControlsProps) => (
    <>
        <GtkButton label="Add row" cssClasses={["pill"]} sensitive={canAdd} onClicked={onAdd} />
        <GtkButton label="Reset" cssClasses={["pill"]} onClicked={onReset} />
    </>
);

const ReorderList = () => {
    const [rows, setRows] = useState(INITIAL_ROWS);
    const [added, setAdded] = useState(0);

    const handleMove = (from: number, to: number) => setRows((current) => moveItem(current, from, to));

    const handleRemove = (id: string) => setRows((current) => current.filter((item) => item.id !== id));

    const handleAdd = () => {
        const label = EXTRA_LABELS[added % EXTRA_LABELS.length] ?? FALLBACK_LABEL;
        setRows((current) => [...current, { id: `extra-${added}`, label }]);
        setAdded((count) => count + 1);
    };

    const handleReset = () => {
        setRows(INITIAL_ROWS);
        setAdded(0);
    };

    return (
        <Stage
            controls={<Controls canAdd={rows.length < MAX_ROWS} onAdd={handleAdd} onReset={handleReset} />}
            readout={`order: ${rows.map((row) => row.id).join(" ")}`}
        >
            <LayoutGroup>
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} valign={Gtk.Align.START}>
                    <AnimatePresence initial={false}>
                        {rows.map((row, index) => (
                            <ReorderRow
                                key={row.id}
                                row={row}
                                index={index}
                                count={rows.length}
                                onMove={handleMove}
                                onRemove={handleRemove}
                            />
                        ))}
                    </AnimatePresence>
                </GtkBox>
            </LayoutGroup>
        </Stage>
    );
};

export const reorderListScene: Scene = {
    id: "reorder-list",
    section: "Layout",
    title: "Reordering",
    summary: "Move a row and every sibling animates to its new slot, with entering and leaving rows in the same list.",
    features: ["layout", "layoutDependency", "LayoutGroup", "AnimatePresence with layout", "moveItem", "exit"],
    notes: [
        "Reorder.Group and Reorder.Item render DOM list elements and are unusable here, so the list is a plain GtkBox and moveItem supplies the reordered copy.",
        "Each row carries layout, so it animates from where it was measured last frame to where the box allocates it now.",
        "layoutDependency={index} tells the projection to remeasure only when the row's position changed, rather than on every render of the scene.",
        "LayoutGroup makes a change in one row dirty the whole group, so removing a row remeasures the rows that stayed.",
        "A leaving row keeps its slot until its exit finishes, so the rows below slide up after the fade rather than during it.",
        "mode=popLayout would pull a leaving row out of the flow on the web, but it needs a real HTML element to measure and is a no-op on GTK.",
        "initial={false} keeps the rows present on mount from playing the enter animation, while a row added later still plays it.",
    ],
    component: ReorderList,
    sourceCode,
};
