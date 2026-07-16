import type * as Gtk from "@gtkx/gi/gtk";
import { type RefObject, useLayoutEffect, useRef } from "react";
import { useLatest } from "./use-latest.js";

type TickRegistration = {
    widget: Gtk.Widget;
    id: number | null;
};

export function useTickCallback(target: RefObject<Gtk.Widget | null> | null, callback: Gtk.TickCallback): void {
    const callbackRef = useLatest(callback);
    const registrationRef = useRef<TickRegistration | null>(null);

    const drop = (): void => {
        const registration = registrationRef.current;
        if (registration === null) return;
        if (registration.id !== null) registration.widget.removeTickCallback(registration.id);
        registrationRef.current = null;
    };

    useLayoutEffect(() => {
        const widget = target?.current ?? null;
        const registration = registrationRef.current;
        if (registration !== null && widget !== null && registration.widget === widget) return;
        drop();
        if (widget === null) return;
        const entry: TickRegistration = { widget, id: null };
        entry.id = widget.addTickCallback((tickWidget, frameClock) => {
            const keep = callbackRef.current(tickWidget, frameClock);
            if (!keep) {
                entry.id = null;
                if (registrationRef.current === entry) registrationRef.current = null;
            }
            return keep;
        });
        registrationRef.current = entry;
    });

    useLayoutEffect(() => () => drop(), []);
}
