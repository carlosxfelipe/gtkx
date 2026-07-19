import * as Gtk from "@gtkx/gi/gtk";
import { AdwHeaderBar, AdwToggle, AdwToggleGroup, AdwWindowTitle } from "@gtkx/jsx/adw";
import { GtkButton } from "@gtkx/jsx/gtk";
import { type SceneView, useScene } from "../context/scene-context.js";

export const GalleryHeaderBar = () => {
    const { scene, view, setView, replay } = useScene();

    return (
        <AdwHeaderBar
            titleWidget={<AdwWindowTitle title={scene.title} subtitle={scene.section} />}
            start={
                <AdwToggleGroup
                    valign={Gtk.Align.CENTER}
                    activeName={view}
                    onNotifyActiveName={(value) => setView((value ?? "demo") as SceneView)}
                >
                    <AdwToggle name="demo" label="Demo" />
                    <AdwToggle name="source" label="Source" />
                </AdwToggleGroup>
            }
            end={
                <GtkButton
                    name="replay-button"
                    iconName="media-playlist-repeat-symbolic"
                    tooltipText="Replay this scene"
                    valign={Gtk.Align.CENTER}
                    onClicked={replay}
                />
            }
        />
    );
};
