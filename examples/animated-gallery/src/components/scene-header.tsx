import * as Gtk from "@gtkx/gi/gtk";
import { AdwWrapBox } from "@gtkx/jsx/adw";
import { GtkBox, GtkLabel } from "@gtkx/jsx/gtk";
import type { Scene } from "../scenes/types.js";
import { chipStyle } from "../theme.js";

export const SceneHeader = ({ scene }: { scene: Scene }) => (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        <GtkLabel cssClasses={["title-1"]} halign={Gtk.Align.START} label={scene.title} />
        <GtkLabel cssClasses={["dim-label"]} halign={Gtk.Align.START} xalign={0} wrap label={scene.summary} />
        <AdwWrapBox childSpacing={6} lineSpacing={6} marginTop={4}>
            {scene.features.map((feature) => (
                <GtkLabel key={feature} cssClasses={[chipStyle]} label={feature} />
            ))}
        </AdwWrapBox>
    </GtkBox>
);
