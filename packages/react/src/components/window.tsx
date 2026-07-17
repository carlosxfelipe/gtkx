import type * as Gtk from "@gtkx/gi/gtk";
import { type ElementType, type ReactNode, type Ref, useCallback, useState } from "react";
import { useMergeRefs } from "../hooks/use-merge-refs.js";
import { ParentWindowContext } from "../hooks/use-parent-window.js";

type WindowComponentProps = {
    ref?: Ref<Gtk.Window | null> | undefined;
};

export const createWindowComponent = (Component: ElementType): ((props: WindowComponentProps) => ReactNode) => {
    return ({ ref, ...rest }: WindowComponentProps): ReactNode => {
        const [window, setWindow] = useState<Gtk.Window | null>(null);

        const handleMount = useCallback((window: Gtk.Window) => {
            window.present();
            setWindow(window);

            return () => {
                window.setDefaultWidget(null);
                window.destroy();
                setWindow(null);
            };
        }, []);

        const mergedRef = useMergeRefs(ref, handleMount);

        return (
            <ParentWindowContext.Provider value={window}>
                <Component ref={mergedRef} {...rest} />
            </ParentWindowContext.Provider>
        );
    };
};
