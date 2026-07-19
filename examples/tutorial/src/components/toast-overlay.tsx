import * as Adw from "@gtkx/gi/adw";
import { AdwToastOverlay } from "@gtkx/jsx/adw";
import { createContext, type ReactNode, type RefObject, useContext, useRef } from "react";

const ToastContext = createContext<RefObject<Adw.ToastOverlay | null> | null>(null);

export const useToast = (): ((title: string, onUndo: () => void) => void) => {
    const overlay = useContext(ToastContext);
    if (overlay === null) throw new Error("useToast must be used inside a ToastProvider");

    return (title, onUndo) => {
        if (overlay.current === null) return;
        const toast = Adw.Toast.new(title);
        toast.buttonLabel = "Undo";
        toast.once("button-clicked", onUndo);
        overlay.current.addToast(toast);
    };
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const overlay = useRef<Adw.ToastOverlay | null>(null);
    return <ToastContext.Provider value={overlay}>{children}</ToastContext.Provider>;
};

export const ToastOverlay = ({ children }: { children: ReactNode }) => {
    const overlay = useContext(ToastContext);
    if (overlay === null) throw new Error("ToastOverlay must be used inside a ToastProvider");

    return (
        <AdwToastOverlay
            ref={(instance) => {
                overlay.current = instance;
                return () => {
                    overlay.current = null;
                };
            }}
        >
            {children}
        </AdwToastOverlay>
    );
};
