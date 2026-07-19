import * as Gtk from "@gtkx/gi/gtk";
import { AdwClamp } from "@gtkx/jsx/adw";
import { GtkBox, GtkScrolledWindow, GtkSeparator } from "@gtkx/jsx/gtk";
import type { Scene } from "../scenes/types.js";
import { SceneHeader } from "./scene-header.js";
import { SceneNotes } from "./scene-notes.js";

export const SceneView = ({ scene }: { scene: Scene }) => {
    const Component = scene.component;

    return (
        <GtkScrolledWindow vexpand hexpand hscrollbarPolicy={Gtk.PolicyType.NEVER} name="scene-scroller">
            <AdwClamp maximumSize={880}>
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={20}
                    marginTop={24}
                    marginBottom={32}
                    marginStart={18}
                    marginEnd={18}
                >
                    <SceneHeader scene={scene} />
                    <GtkSeparator />
                    <Component />
                    <SceneNotes notes={scene.notes} />
                </GtkBox>
            </AdwClamp>
        </GtkScrolledWindow>
    );
};
