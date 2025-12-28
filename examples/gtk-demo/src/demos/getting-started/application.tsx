import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkFrame, GtkLabel } from "@gtkx/react";
import type { Demo } from "../types.js";
import sourceCode from "./application.tsx?raw";

const ApplicationDemo = () => {
    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="Application Structure" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="Every GTKX application follows a simple structure: render() mounts your React component tree to a GTK application identified by a unique application ID."
                wrap
                cssClasses={["dim-label"]}
                halign={Gtk.Align.START}
            />

            <GtkFrame label="Key Concepts">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                        <GtkLabel label="render()" cssClasses={["heading"]} halign={Gtk.Align.START} />
                        <GtkLabel
                            label="The entry point that mounts your React app to a GTK application. Takes your root component and an application ID (e.g., 'com.example.myapp')."
                            wrap
                            cssClasses={["dim-label"]}
                            halign={Gtk.Align.START}
                        />
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                        <GtkLabel label="GtkApplicationWindow" cssClasses={["heading"]} halign={Gtk.Align.START} />
                        <GtkLabel
                            label="The main window container. Use the onCloseRequest prop to handle window close events and properly quit the application."
                            wrap
                            cssClasses={["dim-label"]}
                            halign={Gtk.Align.START}
                        />
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                        <GtkLabel label="Application ID" cssClasses={["heading"]} halign={Gtk.Align.START} />
                        <GtkLabel
                            label="A reverse-DNS identifier (e.g., 'org.gnome.Calculator'). Used by the desktop environment for window grouping, notifications, and settings."
                            wrap
                            cssClasses={["dim-label"]}
                            halign={Gtk.Align.START}
                        />
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                        <GtkLabel label="ApplicationContext" cssClasses={["heading"]} halign={Gtk.Align.START} />
                        <GtkLabel
                            label="A React context that provides the quit() function to gracefully close your application from anywhere in the component tree."
                            wrap
                            cssClasses={["dim-label"]}
                            halign={Gtk.Align.START}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const applicationDemo: Demo = {
    id: "application",
    title: "Application Structure",
    description: "How to structure a GTKX application with render() and ApplicationWindow.",
    keywords: ["application", "structure", "render", "window", "ApplicationWindow", "quit", "context", "setup"],
    component: ApplicationDemo,
    sourceCode,
};
