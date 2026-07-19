import { AdwApplicationWindow, AdwNavigationPage, AdwNavigationSplitView, AdwToolbarView } from "@gtkx/jsx/adw";
import { quit } from "@gtkx/react";
import { useScene } from "../context/scene-context.js";
import { GalleryHeaderBar } from "./gallery-header-bar.js";
import { SceneSidebar } from "./scene-sidebar.js";
import { SceneView } from "./scene-view.js";
import { SourceViewer } from "./source-viewer.js";

export const GalleryWindow = () => {
    const { scene, view, replayToken } = useScene();

    return (
        <AdwApplicationWindow
            name="main-window"
            title="Animated Gallery"
            defaultWidth={1100}
            defaultHeight={760}
            onCloseRequest={quit}
        >
            <AdwNavigationSplitView
                minSidebarWidth={260}
                maxSidebarWidth={320}
                sidebar={
                    <AdwNavigationPage title="Scenes">
                        <SceneSidebar />
                    </AdwNavigationPage>
                }
                content={
                    <AdwNavigationPage title={scene.title}>
                        <AdwToolbarView topBar={<GalleryHeaderBar />}>
                            {view === "source" ? (
                                <SourceViewer scene={scene} />
                            ) : (
                                <SceneView key={`${scene.id}-${replayToken}`} scene={scene} />
                            )}
                        </AdwToolbarView>
                    </AdwNavigationPage>
                }
            />
        </AdwApplicationWindow>
    );
};
