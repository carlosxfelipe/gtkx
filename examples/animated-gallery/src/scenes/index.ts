import { easingAndRepeatScene } from "./basics/easing-and-repeat.js";
import { helloMotionScene } from "./basics/hello-motion.js";
import { keyframesScene } from "./basics/keyframes.js";
import { springsScene } from "./basics/springs.js";
import { dragScene } from "./drag/drag.js";
import { dragHandleScene } from "./drag/drag-handle.js";
import { hoverTapFocusScene } from "./gestures/hover-tap-focus.js";
import { inViewScene } from "./gestures/in-view.js";
import { panScene } from "./gestures/pan.js";
import { layoutProjectionScene } from "./layout/layout-projection.js";
import { reorderListScene } from "./layout/reorder-list.js";
import { sharedElementScene } from "./layout/shared-element.js";
import { imperativeScene } from "./orchestration/imperative.js";
import { motionValuesScene } from "./orchestration/motion-values.js";
import { variantsAndStaggerScene } from "./orchestration/variants-and-stagger.js";
import { enterAndExitScene } from "./presence/enter-and-exit.js";
import { presenceModesScene } from "./presence/presence-modes.js";
import { motionConfigScene } from "./system/motion-config.js";
import type { Scene } from "./types.js";
import { colorAndBoxScene } from "./values/color-and-box.js";
import { cssVariablesScene } from "./values/css-variables.js";
import { filtersAndTextScene } from "./values/filters-and-text.js";
import { transformsScene } from "./values/transforms.js";

export const defaultScene: Scene = helloMotionScene;

export const scenes: Scene[] = [
    helloMotionScene,
    easingAndRepeatScene,
    springsScene,
    keyframesScene,
    transformsScene,
    colorAndBoxScene,
    filtersAndTextScene,
    cssVariablesScene,
    hoverTapFocusScene,
    inViewScene,
    panScene,
    enterAndExitScene,
    presenceModesScene,
    variantsAndStaggerScene,
    motionValuesScene,
    imperativeScene,
    layoutProjectionScene,
    sharedElementScene,
    reorderListScene,
    dragScene,
    dragHandleScene,
    motionConfigScene,
];
