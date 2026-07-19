import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { defaultScene, scenes } from "../scenes/index.js";
import type { Scene } from "../scenes/types.js";

export type SceneView = "demo" | "source";

type SceneContextValue = {
    scene: Scene;
    setScene: (scene: Scene) => void;
    query: string;
    setQuery: (query: string) => void;
    view: SceneView;
    setView: (view: SceneView) => void;
    replayToken: number;
    replay: () => void;
};

const SceneContext = createContext<SceneContextValue | null>(null);

export const useScene = (): SceneContextValue => {
    const value = useContext(SceneContext);
    if (!value) throw new Error("useScene must be used within a SceneProvider");
    return value;
};

export const matchesQuery = (scene: Scene, query: string): boolean => {
    if (query === "") return true;
    const needle = query.toLowerCase();
    return (
        scene.title.toLowerCase().includes(needle) ||
        scene.summary.toLowerCase().includes(needle) ||
        scene.features.some((feature) => feature.toLowerCase().includes(needle))
    );
};

export const SceneProvider = ({ children }: { children: ReactNode }) => {
    const [scene, setSceneState] = useState<Scene>(defaultScene);
    const [query, setQuery] = useState("");
    const [view, setView] = useState<SceneView>("demo");
    const [replayToken, setReplayToken] = useState(0);

    const value = useMemo<SceneContextValue>(
        () => ({
            scene,
            setScene: (next: Scene) => {
                setSceneState(next);
                setReplayToken((token) => token + 1);
            },
            query,
            setQuery,
            view,
            setView,
            replayToken,
            replay: () => setReplayToken((token) => token + 1),
        }),
        [scene, query, view, replayToken],
    );

    return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>;
};

export const allScenes = scenes;
