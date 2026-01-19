import type { NativeHandle } from "@gtkx/native";
import { AttrShape } from "../generated/pango/attr-shape.js";
import { Rectangle } from "../generated/pango/rectangle.js";

declare module "../generated/pango/attr-shape.js" {
    interface AttrShape {
        readonly inkRect: Rectangle;
        readonly logicalRect: Rectangle;
    }
}

Object.defineProperty(AttrShape.prototype, "inkRect", {
    get(this: AttrShape): Rectangle {
        const cache = (this as unknown as { _inkRect?: Rectangle })._inkRect;
        if (cache) return cache;

        const rect = new Rectangle();
        (rect as { handle: NativeHandle }).handle = (BigInt(this.handle as unknown as bigint) +
            16n) as unknown as NativeHandle;
        (this as unknown as { _inkRect: Rectangle })._inkRect = rect;
        return rect;
    },
    enumerable: true,
    configurable: true,
});

Object.defineProperty(AttrShape.prototype, "logicalRect", {
    get(this: AttrShape): Rectangle {
        const cache = (this as unknown as { _logicalRect?: Rectangle })._logicalRect;
        if (cache) return cache;

        const rect = new Rectangle();
        (rect as { handle: NativeHandle }).handle = (BigInt(this.handle as unknown as bigint) +
            32n) as unknown as NativeHandle;
        (this as unknown as { _logicalRect: Rectangle })._logicalRect = rect;
        return rect;
    },
    enumerable: true,
    configurable: true,
});
