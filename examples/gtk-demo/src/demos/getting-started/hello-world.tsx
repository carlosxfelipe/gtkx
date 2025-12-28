import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkLabel } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./hello-world.tsx?raw";

const HelloWorldDemo = () => {
    const [count, setCount] = useState(0);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="Hello World" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="This is the simplest GTKX application. It shows a label and a button that updates state when clicked."
                wrap
                cssClasses={["dim-label"]}
                halign={Gtk.Align.START}
            />

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12} halign={Gtk.Align.CENTER}>
                <GtkLabel label={`Hello from GTKX! Count: ${count}`} cssClasses={["title-4"]} />
                <GtkButton label="Click Me" onClicked={() => setCount(count + 1)} cssClasses={["suggested-action"]} />
            </GtkBox>
        </GtkBox>
    );
};

export const helloWorldDemo: Demo = {
    id: "hello-world",
    title: "Hello World",
    description: "The simplest GTKX application with a label and button.",
    keywords: ["hello", "world", "basic", "simple", "beginner", "start", "first", "GtkLabel", "GtkButton"],
    component: HelloWorldDemo,
    sourceCode,
};
