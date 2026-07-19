import type * as Gtk from "@gtkx/gi/gtk";
import { useFocusEffect } from "@react-navigation/core";
import { type RefObject, useCallback, useRef } from "react";

export type VerticallyScrollable = { getVadjustment(): Gtk.Adjustment | null };

export const useScrollToTop = (ref: RefObject<VerticallyScrollable | null>): void => {
    const focusedBefore = useRef(false);

    useFocusEffect(
        useCallback(() => {
            const wasFocused = focusedBefore.current;
            focusedBefore.current = true;
            if (!wasFocused) return;
            const adjustment = ref.current?.getVadjustment();
            if (!adjustment) return;
            adjustment.setValue(adjustment.getLower());
        }, [ref]),
    );
};
