import type * as Gtk from "@gtkx/gi/gtk";
import { type ElementType, type ReactNode, type Ref, useCallback, useState } from "react";
import { useMergeRefs } from "../hooks/use-merge-refs.js";
import { ParentWindowContext } from "../hooks/use-parent-window.js";

type WindowComponentProps<T extends Gtk.Window> = {
    ref?: Ref<T | null>;
};

export const createWindowComponent = <T extends Gtk.Window>(
    Component: ElementType,
): ((props: WindowComponentProps<T>) => ReactNode) => {
    return ({ ref, ...rest }: WindowComponentProps<T>): ReactNode => {
        const [window, setWindow] = useState<T | null>(null);

        const handleMount = useCallback((window: T) => {
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
