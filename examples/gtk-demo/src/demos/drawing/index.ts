import type { Demo } from "../types.js";
import { drawingAreaDemo } from "./drawingarea.js";
import { imageScalingDemo } from "./image-scaling.js";
import { imagesDemo } from "./images.js";
import { maskDemo } from "./mask.js";
import { paintDemo } from "./paint.js";
import { paintableDemo } from "./paintable.js";
import { paintableAnimatedDemo } from "./paintable-animated.js";
import { paintableSvgDemo } from "./paintable-svg.js";

export const drawingDemos: Demo[] = [
    drawingAreaDemo,
    paintDemo,
    imagesDemo,
    imageScalingDemo,
    maskDemo,
    paintableDemo,
    paintableAnimatedDemo,
    paintableSvgDemo,
];
