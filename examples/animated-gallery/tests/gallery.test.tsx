import * as Gio from "@gtkx/gi/gio";
import * as Gtk from "@gtkx/gi/gtk";
import { AdwApplication } from "@gtkx/jsx/adw";
import { rootElement } from "@gtkx/react";
import { act, render, screen, userEvent, waitFor } from "@gtkx/testing";
import { describe, expect, it } from "vitest";
import { Gallery } from "../src/app.js";
import { defaultScene, scenes } from "../src/scenes/index.js";
import { SECTION_ORDER } from "../src/scenes/types.js";

let nextAppId = 0;

const renderGallery = async () => {
    const result = await render(
        <AdwApplication applicationId={`org.gtkx.animgallery${nextAppId++}`} flags={Gio.ApplicationFlags.NON_UNIQUE}>
            <Gallery />
        </AdwApplication>,
        { container: rootElement },
    );
    await act(async () => {});
    return result;
};

const findSceneList = async (): Promise<Gtk.ListView> => (await screen.findByName("scene-list")) as Gtk.ListView;

const findSearch = async (): Promise<Gtk.SearchEntry> => (await screen.findByName("scene-search")) as Gtk.SearchEntry;

describe("Animated Gallery shell", () => {
    it("renders the main window", async () => {
        await renderGallery();
        expect(await screen.findByName("main-window")).toBeInstanceOf(Gtk.ApplicationWindow);
    });

    it("opens on the default scene", async () => {
        await renderGallery();
        expect((await screen.findAllByText(defaultScene.title)).length).toBeGreaterThan(0);
    });

    it("shows the default scene's summary", async () => {
        await renderGallery();
        expect(await screen.findByText(defaultScene.summary)).toBeInstanceOf(Gtk.Label);
    });

    it("lists every scene in the sidebar", async () => {
        await renderGallery();
        const list = await findSceneList();
        const model = list.getModel() as Gtk.SelectionModel;
        expect(model.getNItems()).toBe(scenes.length);
    });

    it("switches scenes when the sidebar selection changes", async () => {
        await renderGallery();
        const list = await findSceneList();
        const target = scenes[scenes.length - 1] ?? defaultScene;

        await userEvent.selectOptions(list, scenes.length - 1);

        await waitFor(async () => expect((await screen.findAllByText(target.title)).length).toBeGreaterThan(0));
    });

    it("filters the sidebar with the search entry", async () => {
        await renderGallery();
        const list = await findSceneList();
        const search = await findSearch();

        await userEvent.type(search, defaultScene.title);

        await waitFor(() => {
            const model = list.getModel() as Gtk.SelectionModel;
            expect(model.getNItems()).toBeLessThan(scenes.length);
        });
    });

    it("renders a replay button", async () => {
        await renderGallery();
        expect(await screen.findByName("replay-button")).toBeInstanceOf(Gtk.Button);
    });

    it("replays the scene without tearing down the window", async () => {
        await renderGallery();
        const replay = (await screen.findByName("replay-button")) as Gtk.Button;

        await userEvent.click(replay);

        expect((await screen.findAllByText(defaultScene.title)).length).toBeGreaterThan(0);
    });

    it("shows the scene source when the Source toggle is activated", async () => {
        await renderGallery();

        await userEvent.click(await screen.findByText("Source"));

        await waitFor(async () => expect(await screen.findByName("source-view")).not.toBeNull());
    });

    it("gives every scene a unique id", () => {
        expect(new Set(scenes.map((scene) => scene.id)).size).toBe(scenes.length);
    });

    it("assigns every scene to a known section", () => {
        for (const scene of scenes) expect(SECTION_ORDER).toContain(scene.section);
    });

    it("gives every scene its own source code", () => {
        for (const scene of scenes) expect(scene.sourceCode.length).toBeGreaterThan(0);
    });
});
