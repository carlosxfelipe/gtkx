import * as Gio from "@gtkx/gi/gio";
import * as Gtk from "@gtkx/gi/gtk";
import { AdwApplication, AdwApplicationWindow } from "@gtkx/jsx/adw";
import { GtkScrolledWindow } from "@gtkx/jsx/gtk";
import { rootElement } from "@gtkx/react";
import { act, render, screen } from "@gtkx/testing";
import { describe, expect, it } from "vitest";
import { scenes } from "../src/scenes/index.js";
import type { Scene } from "../src/scenes/types.js";

let nextAppId = 0;

const renderScene = async (scene: Scene) => {
    const Component = scene.component;
    const result = await render(
        <AdwApplication applicationId={`org.gtkx.animscene${nextAppId++}`} flags={Gio.ApplicationFlags.NON_UNIQUE}>
            <AdwApplicationWindow name="scene-window" defaultWidth={900} defaultHeight={700}>
                <GtkScrolledWindow name="scene-scroller" vexpand hexpand>
                    <Component />
                </GtkScrolledWindow>
            </AdwApplicationWindow>
        </AdwApplication>,
        { container: rootElement, animations: true },
    );
    await act(async () => {});
    return result;
};

describe("scenes", () => {
    for (const scene of scenes) {
        it(`mounts ${scene.id}`, async () => {
            await renderScene(scene);

            const window = (await screen.findByName("scene-window")) as Gtk.Window;
            const scroller = (await screen.findByName("scene-scroller")) as Gtk.ScrolledWindow;

            expect(window).toBeInstanceOf(Gtk.Window);
            expect(scroller.getChild()).not.toBeNull();
        });
    }
});
