import type * as Gtk from "@gtkx/gi/gtk";
import { useObjectAttachment } from "@gtkx/react/internal";
import { type RefObject, useRef } from "react";

export const useInstalledModel = <W extends Gtk.Widget, M>(
    object: RefObject<W | null>,
    model: M,
    install: (widget: W, model: M) => void,
): void => {
    const installRef = useRef(install);
    installRef.current = install;
    useObjectAttachment<W, { widget: W; model: M }>(object, {
        attach: (widget) => {
            installRef.current(widget, model);
            return { widget, model };
        },
        detach: () => {},
        isSame: (attachment, widget) => attachment.widget === widget && attachment.model === model,
    });
};
