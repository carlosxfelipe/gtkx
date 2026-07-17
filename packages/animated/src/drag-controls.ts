import { type DragControls as FramerDragControls, useDragControls as useFramerDragControls } from "framer-motion";
import type { SyntheticEvent } from "./motion-env.js";

type FramerStart = FramerDragControls["start"];

export type DragControlOptions = NonNullable<Parameters<FramerStart>[1]>;

export interface DragControls extends FramerDragControls {
    start(event: SyntheticEvent | Parameters<FramerStart>[0], options?: DragControlOptions): void;
    cancel(): void;
    stop(): void;
}

export const useDragControls = (): DragControls => useFramerDragControls();
