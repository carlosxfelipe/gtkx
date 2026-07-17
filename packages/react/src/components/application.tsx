import { applicationId as defaultApplicationId } from "virtual:gtkx-config";
import type * as Gtk from "@gtkx/gi/gtk";
import { quitApplication, runApplication } from "@gtkx/runtime";
import { type ElementType, type ReactNode, type Ref, useCallback, useState } from "react";
import { ApplicationContext } from "../hooks/use-application.js";
import { useMergeRefs } from "../hooks/use-merge-refs.js";

const POST_ACTIVATE_PROPS = new Set(["menubar"])

type ApplicationComponentProps<T extends Gtk.Application> = {
    applicationId?: string | null | undefined;
    children?: ReactNode | undefined;
    ref?: Ref<T | null> | undefined;
};

export const createApplicationComponent = <T extends Gtk.Application>(
    Component: ElementType,
): ((props: ApplicationComponentProps<T>) => ReactNode) => {
    return ({ applicationId = defaultApplicationId, children, ref, ...rest }: ApplicationComponentProps<T>): ReactNode => {
        const [app, setApp] = useState<T | null>(null);

        const handleMount = useCallback((instance: T) => {
            runApplication(instance);
            setApp(instance);

            return () => {
                quitApplication(instance);
                setApp(null);
            };
        }, []);

        const mergedRef = useMergeRefs<T>(ref, handleMount);
        const appliedProps = app ? rest : Object.fromEntries(Object.entries(rest).filter(([key]) => !POST_ACTIVATE_PROPS.has(key)));

        return (
            <Component ref={mergedRef} applicationId={applicationId} {...appliedProps}>
                {app ? <ApplicationContext.Provider value={app}>{children}</ApplicationContext.Provider> : null}
            </Component>
        );
    };
};
