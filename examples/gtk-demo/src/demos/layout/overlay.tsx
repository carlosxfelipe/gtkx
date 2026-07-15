import { Grid, Overlay } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkEntry, GtkLabel } from "@gtkx/jsx/gtk";
import { useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./overlay.tsx?raw";

const OverlayDemo = () => {
    const [value, setValue] = useState("");

    const handleNumber = (num: number) => {
        setValue(String(num));
    };

    const handleEntryChanged = (entry: Gtk.Entry) => {
        setValue(entry.getText());
    };

    const buttons = [];
    for (let j = 0; j < 5; j++) {
        for (let i = 0; i < 5; i++) {
            const num = 5 * j + i;
            buttons.push(
                <Grid.Child
                    key={num}
                    component={GtkButton}
                    column={i}
                    row={j}
                    label={String(num)}
                    hexpand
                    vexpand
                    onClicked={() => handleNumber(num)}
                />,
            );
        }
    }

    return (
        <Overlay>
            <Grid name="number-grid">{buttons}</Grid>
            <Overlay.Child
                component={GtkBox}
                orientation={Gtk.Orientation.VERTICAL}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.START}
                canTarget={false}
                spacing={10}
            >
                <GtkLabel name="numbers-label" useMarkup canTarget={false} marginTop={8} marginBottom={8}>
                    {"<span foreground='blue' weight='ultrabold' font='40'>Numbers</span>"}
                </GtkLabel>
            </Overlay.Child>
            <Overlay.Child
                component={GtkEntry}
                text={value}
                placeholderText="Your Lucky Number"
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
                marginTop={8}
                marginBottom={8}
                onChanged={handleEntryChanged}
            />
        </Overlay>
    );
};

export const overlayDemo: Demo = {
    id: "overlay",
    title: "Overlay/Interactive Overlay",
    description:
        "Shows widgets in static positions over a main widget.\n\nThe overlaid widgets can be interactive controls such as the entry in this example, or just decorative, like the big blue label.",
    keywords: ["GtkOverlay"],
    component: OverlayDemo,
    sourceCode,
    defaultWidth: 500,
    defaultHeight: 510,
};
