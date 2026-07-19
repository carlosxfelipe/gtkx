import * as Gtk from "@gtkx/gi/gtk";
import { AdwWrapBox } from "@gtkx/jsx/adw";
import { GtkBox, GtkLabel } from "@gtkx/jsx/gtk";
import type { ReactNode } from "react";
import { monoStyle } from "../theme.js";

type StageProps = {
    controls?: ReactNode;
    aside?: ReactNode;
    readout?: string | undefined;
    children: ReactNode;
};

export const Stage = ({ controls, aside, readout, children }: StageProps) => (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={18}>
        <GtkBox spacing={24} halign={Gtk.Align.CENTER}>
            <GtkBox halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} widthRequest={480} heightRequest={300}>
                {children}
            </GtkBox>
            {aside}
        </GtkBox>
        {controls ? (
            <AdwWrapBox childSpacing={8} lineSpacing={8} halign={Gtk.Align.CENTER}>
                {controls}
            </AdwWrapBox>
        ) : null}
        {readout === undefined ? null : (
            <GtkLabel cssClasses={["dim-label", monoStyle]} halign={Gtk.Align.CENTER} label={readout} />
        )}
    </GtkBox>
);
