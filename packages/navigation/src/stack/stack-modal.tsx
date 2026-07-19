import { Dialog } from "@gtkx/components/adw";
import * as Adw from "@gtkx/gi/adw";
import type { ReactNode } from "react";
import type { StackPresentation, StackScreenOptions } from "./types.js";
import { useRoutePrevented } from "./use-prevent-remove.js";

type StackModalProps = {
    routeKey: string;
    routeName: string;
    options: StackScreenOptions;
    onDismiss: (routeKey: string) => void;
    children: ReactNode;
};

const presentationModeFor = (presentation: StackPresentation): Adw.DialogPresentationMode =>
    presentation === "bottomSheet" ? Adw.DialogPresentationMode.BOTTOM_SHEET : Adw.DialogPresentationMode.AUTO;

export const StackModal = ({ routeKey, routeName, options, onDismiss, children }: StackModalProps): ReactNode => {
    const preventRemove = useRoutePrevented(routeKey);
    const canClose = preventRemove ? false : (options.canPop ?? true);

    const handleCloseAttempt = (): void => {
        if (!preventRemove) return;
        onDismiss(routeKey);
    };

    const handleClose = (): void => onDismiss(routeKey);

    return (
        <Dialog
            title={options.title ?? routeName}
            canClose={canClose}
            presentationMode={presentationModeFor(options.presentation ?? "page")}
            contentWidth={options.contentWidth}
            contentHeight={options.contentHeight}
            followsContentSize={options.followsContentSize}
            onClose={handleClose}
            onCloseAttempt={handleCloseAttempt}
        >
            {children}
        </Dialog>
    );
};
