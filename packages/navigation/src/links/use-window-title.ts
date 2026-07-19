import { useParentWindow } from "@gtkx/react";
import { NavigationContainerRefContext } from "@react-navigation/core";
import { use, useEffect, useRef } from "react";

export type WindowTitleFormatter = (title: string) => string;

const titleFromOptions = (options: object | undefined): string | undefined => {
    if (!options || !("title" in options)) return undefined;
    const { title } = options;
    return typeof title === "string" ? title : undefined;
};

export const useWindowTitle = (format?: WindowTitleFormatter): void => {
    const window = useParentWindow();
    const container = use(NavigationContainerRefContext);
    const formatRef = useRef(format);
    formatRef.current = format;

    useEffect(() => {
        if (!window || !container) return;

        const apply = (): void => {
            const title = titleFromOptions(container.getCurrentOptions()) ?? container.getCurrentRoute()?.name;
            if (title === undefined) return;
            window.setTitle(formatRef.current ? formatRef.current(title) : title);
        };

        apply();
        const unsubscribeOptions = container.addListener("options", apply);
        const unsubscribeState = container.addListener("state", apply);
        return () => {
            unsubscribeOptions();
            unsubscribeState();
        };
    }, [window, container]);
};
