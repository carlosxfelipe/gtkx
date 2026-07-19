import * as Adw from "@gtkx/gi/adw";
import { AdwToastOverlay } from "@gtkx/jsx/adw";
import type { ReactNode } from "react";

let mounted: Adw.ToastOverlay | null = null;

export const showToast = (title: string, onUndo: () => void): void => {
    if (mounted === null) return;
    const toast = Adw.Toast.new(title);
    toast.buttonLabel = "Undo";
    toast.once("button-clicked", onUndo);
    mounted.addToast(toast);
};

export const ToastOverlay = ({ children }: { children: ReactNode }) => (
    <AdwToastOverlay
        ref={(overlay) => {
            mounted = overlay;
            return () => {
                mounted = null;
            };
        }}
    >
        {children}
    </AdwToastOverlay>
);
