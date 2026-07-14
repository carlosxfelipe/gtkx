import type * as Adw from "@gtkx/gi/adw";
import type * as Gtk from "@gtkx/gi/gtk";
import { createPortal, rootElement, useParentWindow, useSignal } from "@gtkx/react";
import { type ReactNode, type RefCallback, useCallback, useLayoutEffect, useRef, useState } from "react";

/** A widget presented as a dialog and force-closed by {@link Dialog}, such as an Adw.Dialog. */
export type DialogInstance = Adw.Dialog;

/** Props for {@link Dialog}. */
export type DialogProps = {
    /** Widget to anchor the dialog to, defaulting to the enclosing window when omitted. */
    parent?: Gtk.Window | null | undefined;
    /** Fires when the user closes the dialog through Escape, the close button, or a swipe, not when React unmounts it. */
    onClose?: () => void;
    /** Renders the dialog widget with the ref that must be attached to it. */
    children: (ref: RefCallback<DialogInstance>) => ReactNode;
};

/**
 * Presents its child dialog through a portal: present on mount, force close on unmount, and
 * onClose on any user-initiated close.
 */
export const Dialog = ({ parent, onClose, children }: DialogProps): ReactNode => {
    const parentWindow = useParentWindow();
    const resolvedParent = parent === undefined ? parentWindow : parent;
    const [dialog, setDialogState] = useState<DialogInstance | null>(null);
    const setDialog = useCallback<RefCallback<DialogInstance>>((instance) => setDialogState(instance), []);
    const closingFromReact = useRef(false);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useLayoutEffect(() => {
        if (!dialog) return;
        closingFromReact.current = false;
        dialog.present(resolvedParent);
        return () => {
            closingFromReact.current = true;
            dialog.forceClose();
        };
    }, [dialog, resolvedParent]);

    useSignal(dialog, "closed", () => {
        if (closingFromReact.current) return;
        onCloseRef.current?.();
    });

    return createPortal(children(setDialog), rootElement);
};
