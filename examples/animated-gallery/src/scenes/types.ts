import type { ComponentType } from "react";

export type SceneSection =
    | "Basics"
    | "Values"
    | "Gestures"
    | "Presence"
    | "Orchestration"
    | "Layout"
    | "Drag"
    | "System";

export type Scene = {
    id: string;
    section: SceneSection;
    title: string;
    summary: string;
    features: string[];
    notes: string[];
    component: ComponentType;
    sourceCode: string;
};

export const SECTION_ORDER: SceneSection[] = [
    "Basics",
    "Values",
    "Gestures",
    "Presence",
    "Orchestration",
    "Layout",
    "Drag",
    "System",
];
