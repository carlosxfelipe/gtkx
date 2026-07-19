import { AdwApplication } from "@gtkx/jsx/adw";
import { GalleryWindow } from "./components/gallery-window.js";
import { SceneProvider } from "./context/scene-context.js";

export const Gallery = () => (
    <SceneProvider>
        <GalleryWindow />
    </SceneProvider>
);

export const App = () => (
    <AdwApplication>
        <Gallery />
    </AdwApplication>
);
