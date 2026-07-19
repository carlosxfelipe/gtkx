import { ListView, type RenderItemProps, type SectionNode } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkInscription, GtkLabel, GtkScrolledWindow, GtkSearchEntry } from "@gtkx/jsx/gtk";
import { allScenes, matchesQuery, useScene } from "../context/scene-context.js";
import type { Scene, SceneSection } from "../scenes/types.js";
import { SECTION_ORDER } from "../scenes/types.js";

const sectionsFor = (query: string): SectionNode<SceneSection, Scene>[] =>
    SECTION_ORDER.map((section) => ({
        id: section,
        value: section,
        data: allScenes
            .filter((scene) => scene.section === section && matchesQuery(scene, query))
            .map((scene) => ({ id: scene.id, value: scene })),
    })).filter((section) => section.data.length > 0);

const renderItem = ({ item }: RenderItemProps<Scene>) => (
    <GtkInscription text={item.title} natChars={24} textOverflow={Gtk.InscriptionOverflow.ELLIPSIZE_END} />
);

const renderHeader = ({ section }: { section: SceneSection }) => (
    <GtkLabel cssClasses={["heading", "dim-label"]} halign={Gtk.Align.START} marginStart={12} marginTop={8}>
        {section}
    </GtkLabel>
);

export const SceneSidebar = () => {
    const { scene, setScene, query, setQuery } = useScene();

    const handleSelectionChanged = (ids: string[]) => {
        const next = allScenes.find((candidate) => candidate.id === ids[0]);
        if (next && next.id !== scene.id) setScene(next);
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL}>
            <GtkSearchEntry
                name="scene-search"
                marginTop={6}
                marginStart={6}
                marginEnd={6}
                placeholderText="Search scenes and APIs"
                onSearchChanged={(entry: Gtk.SearchEntry) => setQuery(entry.getText())}
            />
            <GtkScrolledWindow vexpand hscrollbarPolicy={Gtk.PolicyType.NEVER} cssClasses={["sidebar"]}>
                <ListView
                    name="scene-list"
                    cssClasses={["navigation-sidebar"]}
                    selectionMode={Gtk.SelectionMode.SINGLE}
                    selectedIds={[scene.id]}
                    onSelectionChanged={handleSelectionChanged}
                    renderItem={renderItem}
                    renderHeader={renderHeader}
                    sections={sectionsFor(query)}
                />
            </GtkScrolledWindow>
        </GtkBox>
    );
};
