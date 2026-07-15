import type * as Adw from "@gtkx/gi/adw";
import type * as Gtk from "@gtkx/gi/gtk";
import { AdwDialog } from "@gtkx/jsx/adw";
import { createPortal, rootElement, useParentWindow, useSignal } from "@gtkx/react";
import { useMergeRefs } from "@gtkx/react/internal";
import {
    type ElementType,
    type ReactNode,
    type RefCallback,
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { asPolymorphicProps, type PolymorphicComponentProps } from "./types.js";

/** A widget presented as a dialog and force-closed by {@link Dialog}, such as an Adw.Dialog. */
export type DialogInstance = Adw.Dialog;

export type DialogOwnProps = {
    /** Widget to anchor the dialog to, defaulting to the enclosing window when omitted. */
    parent?: Gtk.Window | null | undefined;
    /** Fires when the user closes the dialog through Escape, the close button, or a swipe, not when React unmounts it. */
    onClose?: () => void;
};

/**
 * Props for {@link Dialog}. The dialog widget is chosen through the `component` prop, defaulting to
 * AdwDialog, and the remaining props are that component's own props.
 */
export type DialogProps<C extends ElementType = typeof AdwDialog> = PolymorphicComponentProps<
    C,
    DialogInstance,
    DialogOwnProps
>;

/**
 * Presents its dialog widget through a portal: present on mount, force close on unmount, and
 * onClose on any user-initiated close.
 */
export const Dialog = <C extends ElementType = typeof AdwDialog>(props: DialogProps<C>): ReactNode => {
    const { component, parent, onClose, ref, ...rest } = asPolymorphicProps<DialogOwnProps, DialogInstance>(props);
    const Component = component ?? AdwDialog;

    const parentWindow = useParentWindow();
    const resolvedParent = parent === undefined ? parentWindow : parent;
    const [dialog, setDialogState] = useState<DialogInstance | null>(null);
    const captureDialog = useCallback<RefCallback<DialogInstance>>((instance) => setDialogState(instance), []);
    const setRef = useMergeRefs<DialogInstance>(ref, captureDialog);
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

    return createPortal(<Component {...rest} ref={setRef} />, rootElement);
};
