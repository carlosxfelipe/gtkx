import type * as Gio from "@gtkx/gi/gio";
import { useSignal } from "@gtkx/react";
import { ApplicationContext } from "@gtkx/react/internal";
import type { NavigationContainerRef, ParamListBase } from "@react-navigation/core";
import { type RefObject, use, useEffect } from "react";
import { applyURLToRef } from "./linking-state.js";
import type { LinkingOptions } from "./types.js";

export const useURLSubscription = <ParamList extends ParamListBase>(
    ref: RefObject<NavigationContainerRef<ParamList> | null>,
    options: LinkingOptions<ParamList> | undefined,
): void => {
    const application = use(ApplicationContext);
    const enabled = options !== undefined && options.enabled !== false;

    useSignal(enabled ? application : null, "open", (files: Gio.File[]) => {
        if (!options) return;
        for (const file of files) applyURLToRef(ref, file.getUri(), options);
    });

    useEffect(() => {
        if (!enabled || !options?.subscribe) return;
        return options.subscribe((url) => applyURLToRef(ref, url, options));
    }, [enabled, options, ref]);
};
