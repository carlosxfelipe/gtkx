import type * as GObject from "@gtkx/gi/gobject";
import { useLayoutEffect, useRef } from "react";
import { type ObjectProp, resolveObjectProp } from "../utils/object-prop.js";

type ObjectAttachmentOps<T extends GObject.Object, A> = {
    attach(object: T): A;
    detach(attachment: A): void;
    isSame(attachment: A, object: T): boolean;
};

export const useObjectAttachment = <T extends GObject.Object, A>(
    object: ObjectProp<T>,
    ops: ObjectAttachmentOps<T, A>,
): void => {
    const attachmentRef = useRef<A | null>(null);

    const drop = (): void => {
        const attachment = attachmentRef.current;
        if (attachment !== null) {
            ops.detach(attachment);
            attachmentRef.current = null;
        }
    };

    useLayoutEffect(() => {
        const resolved = resolveObjectProp(object);
        const attachment = attachmentRef.current;
        if (attachment !== null && resolved !== null && ops.isSame(attachment, resolved)) return;
        drop();
        if (resolved === null) return;
        attachmentRef.current = ops.attach(resolved);
    });

    useLayoutEffect(() => () => drop(), []);
};
